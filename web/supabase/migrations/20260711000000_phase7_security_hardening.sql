-- Phase 7 (security hardening + data-integrity + perf).
--
-- Apply on the hosted project via the SQL Editor (this project has no CLI wired
-- up — see the supabase-deploy-workflow memory), then verify with the anon-key
-- probe script.

-- ============================================================================
-- 1. Revoke EXECUTE on every RPC from `anon`.
--
-- The Phase 1-6 functions all use the `revoke execute ... from public;
-- grant ... to authenticated` idiom, intending "authenticated only". But
-- Supabase's default privileges already grant EXECUTE to `anon` individually,
-- and `revoke ... from public` does NOT remove a grant held directly by `anon`.
-- So every RPC was in fact callable by `anon` — harmless today only because
-- each one re-checks is_active_admin()/active-member INSIDE the body, but a
-- single future RPC that forgets that guard would be wide open.
--
-- Strip anon's function access outright and stop new functions from re-granting
-- it, so the role boundary is enforced by the grant, not just by in-body checks.
-- authenticated keeps its grants untouched. Trigger functions (handle_new_user,
-- protect_super_admin, set_article_timestamps, ...) run with the table owner's
-- rights regardless of EXECUTE grants, so revoking here doesn't affect them.
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- ============================================================================
-- 2. event_registrations INSERT: require registration-mode AND a still-open
-- event for BOTH the self-service and admin paths.
--
-- Before, the admin branch (`is_active_admin()`) short-circuited with no mode
-- or date check, so an admin could seed registration rows on a universal-mode
-- agenda (which never uses a roster) or on an event long finished. The self
-- branch checked mode but not the date, letting a member register for a past
-- agenda via the API. Fold the shared guard (mode = 'registration', not past
-- the check_in cutoff) out front, keeping the per-actor rule inside.
drop policy if exists "event_registrations_insert" on public.event_registrations;

create policy "event_registrations_insert" on public.event_registrations
  for insert to authenticated
  with check (
    exists (
      select 1 from public.agendas a
      where a.id = agenda_id
        and a.mode = 'registration'
        and (a.event_date + a.end_time + interval '2 hours') >= (now() at time zone 'Asia/Jakarta')
    )
    and (
      private.is_active_admin()
      or (
        member_id = auth.uid()
        and exists (select 1 from public.profiles p where p.id = auth.uid() and public.is_member_currently_active(p))
      )
    )
  );

-- ============================================================================
-- 3. event_registrations DELETE: a member can no longer self-cancel once their
-- attendance is already recorded.
--
-- The roster page lists registrants and reads attendance per member_id. If a
-- member un-registers after being marked present, their event_attendance row
-- survives but they vanish from the roster — the admin loses sight of a real
-- attendee. Block that specific case; admins can still remove anyone.
drop policy if exists "event_registrations_delete" on public.event_registrations;

create policy "event_registrations_delete" on public.event_registrations
  for delete to authenticated
  using (
    private.is_active_admin()
    or (
      member_id = auth.uid()
      and not exists (
        select 1 from public.event_attendance ea
        where ea.agenda_id = event_registrations.agenda_id
          and ea.member_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 4. Indexes for the per-member lookups useAgendas runs on every page load for
-- a signed-in user (attendance + registrations filtered by member_id). The
-- unique (agenda_id, member_id) constraints only help agenda-first queries.
create index if not exists event_attendance_member_id_idx
  on public.event_attendance (member_id);
create index if not exists event_registrations_member_id_idx
  on public.event_registrations (member_id);

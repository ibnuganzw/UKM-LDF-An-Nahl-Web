-- Phase 2: Member Lifecycle (active/alumni by angkatan)
-- See plan: C:\Users\ibnuh\.claude\plans\mellow-conjuring-bunny.md

-- ============================================================================
-- academic_override: nullable, admin-set escape hatch for the angkatan+4
-- formula (cuti/DO/early-or-late graduation). NULL = use the computed rule.
-- Locked from self-service update — the Phase 1 `grant update (name)` on
-- profiles already means `authenticated` has no privilege on this new
-- column either, so it's only reachable via set_academic_override() below.
-- ============================================================================
create type public.academic_status as enum ('active', 'inactive');

alter table public.profiles
  add column academic_override public.academic_status;

-- ============================================================================
-- is_member_currently_active: the single source of truth for "counts as an
-- active member right now" — used for display here, and (in Phase 3) for
-- filtering the roster of `universal`-mode event attendance.
-- ============================================================================
create or replace function public.is_member_currently_active(p_profile public.profiles)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_profile.status = 'active'
    and (
      -- super_admin is the permanent site owner, not a student being tracked
      -- for graduation — never excluded by the academic formula.
      p_profile.role = 'super_admin'
      or case
        when p_profile.academic_override is not null then p_profile.academic_override = 'active'
        else extract(year from (now() at time zone 'Asia/Jakarta'))::int < (p_profile.angkatan_year + 4)
      end
    )
$$;

-- ============================================================================
-- RPC: admin-only manual override (active / inactive / NULL to reset to the
-- automatic angkatan+4 computation). Same shape as the Phase 1 RPCs. No
-- role restriction on the target — member and admin profiles are both
-- subject to the academic formula, only super_admin is exempt (handled
-- above in is_member_currently_active, not by blocking writes here).
-- ============================================================================
create or replace function public.set_academic_override(p_target_id uuid, p_value public.academic_status)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result public.profiles;
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.profiles
    set academic_override = p_value
    where id = p_target_id
    returning * into v_result;

  if v_result.id is null then
    raise exception 'target member not found';
  end if;

  return v_result;
end;
$$;

revoke execute on function public.set_academic_override(uuid, public.academic_status) from public;
grant execute on function public.set_academic_override(uuid, public.academic_status) to authenticated;

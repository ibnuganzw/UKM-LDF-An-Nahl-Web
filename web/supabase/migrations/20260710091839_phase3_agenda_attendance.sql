-- Phase 3: Agenda, Registration, & Real QR Attendance
-- See plan: C:\Users\ibnuh\.claude\plans\mellow-conjuring-bunny.md

create extension if not exists pgcrypto;

-- ============================================================================
-- agendas — replaces the static web/src/data/agendas.ts array.
-- `type` stays plain text (not an enum) since event categories are more
-- likely to grow over time than the fixed 3-tier role model; validated at
-- the application layer instead.
-- ============================================================================
create type public.agenda_mode as enum ('universal', 'registration');

create table public.agendas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  mode public.agenda_mode not null default 'universal',
  event_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  pj text not null,
  pemateri text,
  description text not null,
  qr_token text,
  qr_opened_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.agendas enable row level security;

-- Public read (Beranda/Agenda pages are unauthenticated).
create policy "agendas_select_all" on public.agendas
  for select to anon, authenticated using (true);

create policy "agendas_insert_admin" on public.agendas
  for insert to authenticated with check (private.is_active_admin());

create policy "agendas_update_admin" on public.agendas
  for update to authenticated using (private.is_active_admin()) with check (private.is_active_admin());

create policy "agendas_delete_admin" on public.agendas
  for delete to authenticated using (private.is_active_admin());

-- ============================================================================
-- event_registrations — opt-in roster for `registration`-mode agendas.
-- registered_by distinguishes self opt-in (null) from an admin manually
-- adding someone. Plain RLS is sufficient here (no cross-row counting), but
-- self-registration is gated to registration-mode agendas + active members
-- so a pending/alumni account or a universal-mode agenda can't collect
-- meaningless registration rows.
-- ============================================================================
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.agendas(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  registered_by uuid references public.profiles(id) on delete set null,
  unique (agenda_id, member_id)
);

alter table public.event_registrations enable row level security;

create policy "event_registrations_select" on public.event_registrations
  for select to authenticated
  using (member_id = auth.uid() or private.is_active_admin());

create policy "event_registrations_insert" on public.event_registrations
  for insert to authenticated
  with check (
    private.is_active_admin()
    or (
      member_id = auth.uid()
      and exists (select 1 from public.agendas a where a.id = agenda_id and a.mode = 'registration')
      and exists (select 1 from public.profiles p where p.id = auth.uid() and public.is_member_currently_active(p))
    )
  );

create policy "event_registrations_delete" on public.event_registrations
  for delete to authenticated
  using (member_id = auth.uid() or private.is_active_admin());

-- ============================================================================
-- event_attendance — real check-in ledger, replacing the single-session,
-- not-even-keyed-by-user AttendanceRecord from the Phase 1-era mock.
-- No insert/update/delete policy for `authenticated` at all — every write
-- goes through check_in() / mark_attendance() / unmark_attendance() below,
-- since check-in needs server-side token + time-window validation and
-- admin-marking is a privileged action.
-- ============================================================================
create table public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.agendas(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null check (method in ('self_scan', 'admin_marked')),
  unique (agenda_id, member_id)
);

alter table public.event_attendance enable row level security;

create policy "event_attendance_select" on public.event_attendance
  for select to authenticated
  using (member_id = auth.uid() or private.is_active_admin());

-- ============================================================================
-- RPC: self-service check-in via the QR link (/scan/:agendaId?token=...).
-- Static token per session (set by open_agenda_qr) — no rotation. Only
-- upper-bounds the window (event end + 2h grace) since a missing/cleared
-- qr_token already blocks check-in once admin closes the session early.
-- ============================================================================
create or replace function public.check_in(p_agenda_id uuid, p_token text)
returns public.event_attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agenda public.agendas;
  v_profile public.profiles;
  v_result public.event_attendance;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or not public.is_member_currently_active(v_profile) then
    raise exception 'Hanya anggota aktif yang bisa absen';
  end if;

  select * into v_agenda from public.agendas where id = p_agenda_id;
  if v_agenda.id is null then
    raise exception 'Agenda tidak ditemukan';
  end if;

  if v_agenda.qr_token is null or v_agenda.qr_token <> p_token then
    raise exception 'QR tidak valid atau sudah tidak aktif';
  end if;

  if (now() at time zone 'Asia/Jakarta') > (v_agenda.event_date + v_agenda.end_time + interval '2 hours') then
    raise exception 'Sesi absensi sudah berakhir';
  end if;

  insert into public.event_attendance (agenda_id, member_id, method)
  values (p_agenda_id, auth.uid(), 'self_scan')
  on conflict (agenda_id, member_id) do nothing;

  select * into v_result from public.event_attendance
    where agenda_id = p_agenda_id and member_id = auth.uid();
  return v_result;
end;
$$;

revoke execute on function public.check_in(uuid, text) from public;
grant execute on function public.check_in(uuid, text) to authenticated;

-- ============================================================================
-- RPC: admin opens/closes the QR session for a universal-mode agenda.
-- ============================================================================
create or replace function public.open_agenda_qr(p_agenda_id uuid)
returns public.agendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result public.agendas;
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.agendas
    set qr_token = encode(gen_random_bytes(12), 'hex'),
        qr_opened_at = now()
    where id = p_agenda_id
    returning * into v_result;

  if v_result.id is null then
    raise exception 'agenda not found';
  end if;

  return v_result;
end;
$$;

revoke execute on function public.open_agenda_qr(uuid) from public;
grant execute on function public.open_agenda_qr(uuid) to authenticated;

create or replace function public.close_agenda_qr(p_agenda_id uuid)
returns public.agendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result public.agendas;
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.agendas
    set qr_token = null, qr_opened_at = null
    where id = p_agenda_id
    returning * into v_result;

  if v_result.id is null then
    raise exception 'agenda not found';
  end if;

  return v_result;
end;
$$;

revoke execute on function public.close_agenda_qr(uuid) from public;
grant execute on function public.close_agenda_qr(uuid) to authenticated;

-- ============================================================================
-- RPC: admin manually marks/unmarks attendance — the whole attendance
-- mechanism for `registration`-mode agendas (small, pre-known roster; no QR).
-- ============================================================================
create or replace function public.mark_attendance(p_agenda_id uuid, p_member_id uuid)
returns public.event_attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result public.event_attendance;
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into public.event_attendance (agenda_id, member_id, method)
  values (p_agenda_id, p_member_id, 'admin_marked')
  on conflict (agenda_id, member_id) do nothing;

  select * into v_result from public.event_attendance
    where agenda_id = p_agenda_id and member_id = p_member_id;
  return v_result;
end;
$$;

revoke execute on function public.mark_attendance(uuid, uuid) from public;
grant execute on function public.mark_attendance(uuid, uuid) to authenticated;

create or replace function public.unmark_attendance(p_agenda_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.event_attendance where agenda_id = p_agenda_id and member_id = p_member_id;
end;
$$;

revoke execute on function public.unmark_attendance(uuid, uuid) from public;
grant execute on function public.unmark_attendance(uuid, uuid) to authenticated;

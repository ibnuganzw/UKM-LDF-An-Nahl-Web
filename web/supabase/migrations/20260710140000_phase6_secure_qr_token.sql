-- Phase 6 (security fix): stop leaking agendas.qr_token to everyone.
--
-- Bug: the Phase 3 `agendas_select_all` policy (`using (true)` for anon +
-- authenticated) is row-level, so it exposed EVERY column of every agenda —
-- including qr_token — to any visitor. RLS cannot restrict columns. The
-- attendance QR is meant to prove physical presence: only someone who scans
-- the printed QR at the venue should know the token. But since qr_token sat in
-- the world-readable agendas response, any logged-in active member could read
-- the token straight from the API and call check_in() remotely, without ever
-- attending — trivially scriptable across many agendas at once.
--
-- Fix: replace the table-wide SELECT grant with a column-level SELECT grant
-- that omits qr_token, so anon/authenticated can still read everything they
-- need (the app derives "QR active?" from qr_opened_at, which is not a secret),
-- but the token value is no longer selectable. The token is still fully
-- reachable server-side by the SECURITY DEFINER check_in()/open_agenda_qr()
-- functions (definer rights bypass column grants) and by service_role.

-- Supabase's default role setup grants table-wide privileges on public tables
-- to anon/authenticated (RLS is the row gate). Drop just the SELECT half and
-- re-grant it per-column, leaving INSERT/UPDATE/DELETE (used by the admin
-- write paths, gated by the existing admin RLS policies) untouched.
revoke select on public.agendas from anon, authenticated;

grant select (
  id, title, type, mode, event_date, start_time, end_time,
  location, pj, pemateri, description, qr_opened_at, created_by, created_at
) on public.agendas to anon, authenticated;

-- The one legitimate reader of the raw token on the client is the admin QR
-- display page. Hand it out through an admin-only RPC instead of the table, so
-- the token is gated by the same is_active_admin() check as every other
-- privileged action rather than by "can you read this row" (which is everyone).
create or replace function public.get_agenda_qr_token(p_agenda_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select qr_token into v_token from public.agendas where id = p_agenda_id;
  return v_token;
end;
$$;

revoke execute on function public.get_agenda_qr_token(uuid) from public;
grant execute on function public.get_agenda_qr_token(uuid) to authenticated;

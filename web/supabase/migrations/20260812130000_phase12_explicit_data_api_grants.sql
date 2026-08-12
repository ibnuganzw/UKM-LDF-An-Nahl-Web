-- Phase 12: make Data API privileges explicit for projects created after the
-- Supabase default-grant change. RLS remains the row-level authorization gate;
-- these grants only expose the operations the existing policies already allow.
--
-- Deliberately do not add broad default privileges. New tables should remain
-- closed until their API contract and RLS policies are reviewed explicitly.

grant usage on schema public to anon, authenticated, service_role;

-- Member profiles are private to the signed-in member or an active admin.
-- Phase 1 already grants authenticated users column-scoped UPDATE(name).
grant select on public.profiles to authenticated;

-- Keep the Phase 6 QR-token protection: public clients can read agenda metadata,
-- but never the raw qr_token column. Admin writes are still gated by RLS.
grant select (
  id, title, type, mode, event_date, start_time, end_time,
  location, pj, pemateri, description, qr_opened_at, created_by, created_at
) on public.agendas to anon, authenticated;
grant insert, update, delete on public.agendas to authenticated;

grant select, insert, delete on public.event_registrations to authenticated;
grant select on public.event_attendance to authenticated;

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

grant select on public.org_positions to anon, authenticated;
grant insert, update, delete on public.org_positions to authenticated;

grant select on public.division_members to anon, authenticated;
grant insert, update, delete on public.division_members to authenticated;

-- Edge Functions and platform administration use service_role. Keep its access
-- explicit because new projects no longer receive automatic table grants.
grant all privileges on table
  public.profiles,
  public.agendas,
  public.event_registrations,
  public.event_attendance,
  public.articles,
  public.org_positions,
  public.division_members,
  public.admin_audit_logs
to service_role;

grant usage, select, update on sequence public.admin_audit_logs_id_seq to service_role;

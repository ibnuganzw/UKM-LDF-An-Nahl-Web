-- Phase 10: immutable, server-side audit trail for privileged admin writes.
-- Apply after the earlier schema migrations. The frontend degrades gracefully
-- when this migration has not reached production yet.

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id);

alter table public.admin_audit_logs enable row level security;

create policy "admin_audit_logs_select_admin"
  on public.admin_audit_logs for select to authenticated
  using (private.is_active_admin());

-- Supabase's legacy default grants can include SELECT, TRUNCATE, REFERENCES,
-- TRIGGER, and sequence privileges for API roles. The audit trail is written
-- only by the SECURITY DEFINER trigger function, so remove every direct write
-- path before granting the one capability the admin UI needs.
revoke all on public.admin_audit_logs from anon, authenticated;
revoke all on sequence public.admin_audit_logs_id_seq from anon, authenticated;
grant select on public.admin_audit_logs to authenticated;

create or replace function private.capture_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_entity_id text;
begin
  -- Cascades or ordinary member self-service writes are intentionally omitted.
  if not private.is_active_admin() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_before := to_jsonb(old) - 'qr_token' - 'content_html';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_after := to_jsonb(new) - 'qr_token' - 'content_html';
  end if;

  v_entity_id := coalesce(v_after ->> 'id', v_before ->> 'id', v_after ->> 'agenda_id', v_before ->> 'agenda_id');

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_strip_nulls(jsonb_build_object('before', v_before, 'after', v_after))
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function private.capture_admin_audit() from public;

create trigger agendas_admin_audit after insert or update or delete on public.agendas
  for each row execute function private.capture_admin_audit();
create trigger event_registrations_admin_audit after insert or update or delete on public.event_registrations
  for each row execute function private.capture_admin_audit();
create trigger event_attendance_admin_audit after insert or update or delete on public.event_attendance
  for each row execute function private.capture_admin_audit();
create trigger articles_admin_audit after insert or update or delete on public.articles
  for each row execute function private.capture_admin_audit();
create trigger profiles_admin_audit after insert or update or delete on public.profiles
  for each row execute function private.capture_admin_audit();
create trigger org_positions_admin_audit after insert or update or delete on public.org_positions
  for each row execute function private.capture_admin_audit();
create trigger division_members_admin_audit after insert or update or delete on public.division_members
  for each row execute function private.capture_admin_audit();

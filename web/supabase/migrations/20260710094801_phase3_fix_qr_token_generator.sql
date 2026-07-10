-- Fix: open_agenda_qr() called pgcrypto's gen_random_bytes() unqualified,
-- which cannot resolve under `set search_path = ''` (empty search path means
-- no schema is searched for unqualified names, and pgcrypto's functions live
-- outside pg_catalog). gen_random_uuid() is a Postgres core built-in
-- (pg_catalog, always resolvable regardless of search_path) since PG13, so
-- it needs no extension and no schema qualification — simpler and avoids
-- the issue entirely rather than qualifying the old call.
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
    set qr_token = gen_random_uuid()::text,
        qr_opened_at = now()
    where id = p_agenda_id
    returning * into v_result;

  if v_result.id is null then
    raise exception 'agenda not found';
  end if;

  return v_result;
end;
$$;

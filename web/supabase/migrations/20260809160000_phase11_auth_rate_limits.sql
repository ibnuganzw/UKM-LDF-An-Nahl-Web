-- Phase 11: server-side rate limits for the public NIM login/reset functions.
-- Raw NIMs and IP addresses never enter the database; Edge Functions submit a
-- SHA-256 key derived with the service-role secret as a pepper.

create table if not exists private.auth_rate_limit_buckets (
  scope text not null,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  primary key (scope, key_hash, window_start)
);

create index if not exists auth_rate_limit_buckets_window_idx
  on private.auth_rate_limit_buckets (window_start);

revoke all on private.auth_rate_limit_buckets from public, anon, authenticated;

create or replace function public.consume_auth_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_attempts integer;
begin
  if p_scope not in ('nim-login-ip', 'nim-login-nim', 'nim-reset-ip', 'nim-reset-nim')
    or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_limit > 1000
    or p_window_seconds < 60 or p_window_seconds > 86400
  then
    raise exception 'invalid auth rate-limit parameters' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.auth_rate_limit_buckets (scope, key_hash, window_start, attempts)
  values (p_scope, p_key_hash, v_window_start, 1)
  on conflict (scope, key_hash, window_start)
  do update set attempts = private.auth_rate_limit_buckets.attempts + 1
  returning attempts into v_attempts;

  delete from private.auth_rate_limit_buckets
  where window_start < clock_timestamp() - interval '2 days';

  return v_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, text, integer, integer)
  to service_role;

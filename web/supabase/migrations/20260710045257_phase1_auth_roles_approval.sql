-- Phase 1: Auth, Roles, & Membership Approval
-- See plan: C:\Users\ibnuh\.claude\plans\mellow-conjuring-bunny.md

-- ============================================================================
-- Internal-only schema. Never exposed via PostgREST (Supabase only exposes
-- `public`/`graphql_public` by default), so anything placed here is
-- unreachable via supabase.rpc(...) regardless of GRANTs.
-- ============================================================================
create schema if not exists private;

-- ============================================================================
-- Types
-- ============================================================================
create type public.user_role as enum ('member', 'admin', 'super_admin');
create type public.membership_status as enum ('pending', 'active', 'rejected');

-- ============================================================================
-- profiles
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  email_confirmed_at timestamptz,
  name text not null,
  nim text not null unique check (nim ~ '^[0-9]+$'),
  angkatan_year int not null check (
    angkatan_year >= 2000
    and angkatan_year <= extract(year from now())::int + 1
  ),
  role public.user_role not null default 'member',
  status public.membership_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Guarantees at most one super_admin row can ever exist. Combined with the
-- protect_super_admin trigger below (blocks demoting/deleting it), this
-- becomes "exactly one, forever" operationally once the one-time manual seed
-- happens.
create unique index profiles_at_most_one_super_admin_idx
  on public.profiles ((true))
  where role = 'super_admin';

alter table public.profiles enable row level security;

-- Members can only self-service update their own display name. nim /
-- angkatan_year / role / status can only change through the security-definer
-- RPCs below (those run as the table owner and are not subject to this
-- column-level GRANT restriction).
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- ============================================================================
-- Internal helper (schema `private`)
-- ============================================================================
grant usage on schema private to authenticated;

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and status = 'active'
  );
$$;

revoke execute on function private.is_active_admin() from public;
grant execute on function private.is_active_admin() to authenticated;

-- ============================================================================
-- Triggers on auth.users
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_nim text;
  v_angkatan_year int;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'name', '');
  v_nim := btrim(coalesce(new.raw_user_meta_data ->> 'nim', ''));
  v_angkatan_year := nullif(new.raw_user_meta_data ->> 'angkatan_year', '')::int;

  if v_angkatan_year is null then
    raise exception 'angkatan_year is required to register';
  end if;

  insert into public.profiles (id, email, email_confirmed_at, name, nim, angkatan_year, role, status)
  values (
    new.id,
    new.email,
    new.email_confirmed_at,
    v_name,
    v_nim,
    v_angkatan_year,
    'member',
    'pending'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_auth_user_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email
     or new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.profiles
      set email = new.email,
          email_confirmed_at = new.email_confirmed_at
      where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.sync_auth_user_changes();

-- ============================================================================
-- Trigger on public.profiles — protects the single super_admin row
-- ============================================================================
-- Rejects any role change away from super_admin, or any delete of that row,
-- regardless of caller (including the RPCs below — triggers still fire for
-- security-definer callers). This protects against app/API-driven changes;
-- it cannot and does not protect against the database owner deliberately
-- disabling the trigger via direct SQL access.
create or replace function public.protect_super_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'super_admin' then
      raise exception 'the super_admin account cannot be deleted';
    end if;
    return old;
  end if;

  if old.role = 'super_admin' and new.role is distinct from old.role then
    raise exception 'the super_admin role cannot be changed';
  end if;

  return new;
end;
$$;

create trigger trg_protect_super_admin_update
  before update on public.profiles
  for each row execute function public.protect_super_admin();

create trigger trg_protect_super_admin_delete
  before delete on public.profiles
  for each row execute function public.protect_super_admin();

-- ============================================================================
-- RLS policies
-- ============================================================================
create policy "profiles_select_self_or_admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or private.is_active_admin());

create policy "profiles_update_self_name"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert/delete policy for `authenticated` — inserts only happen via the
-- handle_new_user trigger (runs as definer, bypasses RLS); deletes only
-- happen via `on delete cascade` from auth.users.

-- ============================================================================
-- RPCs (security definer, callable via supabase.rpc(...))
-- ============================================================================

-- Promote a member to admin, or demote an admin back to member.
create or replace function public.set_member_role(p_target_id uuid, p_new_role public.user_role)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
  v_admin_count int;
  v_result public.profiles;
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Never allow this function to assign super_admin — the only path to that
  -- role is the one-time manual seed in the SQL Editor. Relying solely on
  -- the unique index would surface a raw constraint-violation error instead
  -- of a deliberate authorization rejection.
  if p_new_role not in ('member', 'admin') then
    raise exception 'Role hanya dapat diubah menjadi member atau admin';
  end if;

  select * into v_target from public.profiles where id = p_target_id;
  if v_target.id is null then
    raise exception 'target member not found';
  end if;

  if v_target.role = 'super_admin' then
    raise exception 'super_admin role cannot be changed';
  end if;

  if p_new_role = 'admin' and v_target.status <> 'active' then
    raise exception 'only active members can be promoted to admin';
  end if;

  if p_new_role = 'admin' and v_target.role <> 'admin' then
    -- Serialize concurrent promotions so two simultaneous calls can't both
    -- observe count = 1 and both succeed, landing at 3 admins.
    perform pg_advisory_xact_lock(hashtext('annahl_admin_role_change'));

    select count(*) into v_admin_count from public.profiles where role = 'admin';
    if v_admin_count >= 2 then
      raise exception 'Batas maksimum 2 admin sudah tercapai. Turunkan salah satu admin terlebih dahulu.';
    end if;
  end if;

  update public.profiles
    set role = p_new_role
    where id = p_target_id
    returning * into v_result;

  return v_result;
end;
$$;

revoke execute on function public.set_member_role(uuid, public.user_role) from public;
grant execute on function public.set_member_role(uuid, public.user_role) to authenticated;

-- Approve / reject / reset-to-pending a plain member. Can never touch an
-- admin/super_admin row (demote via set_member_role first).
create or replace function public.set_member_status(p_target_id uuid, p_new_status public.membership_status)
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
    set status = p_new_status
    where id = p_target_id and role = 'member'
    returning * into v_result;

  if v_result.id is null then
    raise exception 'member not found, or target is an admin/super_admin (demote first)';
  end if;

  return v_result;
end;
$$;

revoke execute on function public.set_member_status(uuid, public.membership_status) from public;
grant execute on function public.set_member_status(uuid, public.membership_status) to authenticated;

-- The only way to correct a member's nim/angkatan_year/name after signup
-- (those columns are locked from self-service update). Can never target the
-- super_admin's own profile, even by themselves.
create or replace function public.admin_update_member_profile(
  p_target_id uuid,
  p_new_name text,
  p_new_nim text,
  p_new_angkatan_year int
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
  v_nim text;
  v_result public.profiles;
begin
  if not private.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_target_id;
  if v_target.id is null then
    raise exception 'target member not found';
  end if;

  if v_target.role = 'super_admin' then
    raise exception 'Profil pemilik tidak dapat diubah melalui fungsi ini';
  end if;

  v_nim := btrim(p_new_nim);
  if v_nim !~ '^[0-9]+$' then
    raise exception 'NIM harus berupa angka';
  end if;

  if p_new_angkatan_year < 2000 or p_new_angkatan_year > extract(year from now())::int + 1 then
    raise exception 'angkatan_year di luar rentang yang wajar';
  end if;

  update public.profiles
    set name = p_new_name,
        nim = v_nim,
        angkatan_year = p_new_angkatan_year
    where id = p_target_id
    returning * into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_update_member_profile(uuid, text, text, int) from public;
grant execute on function public.admin_update_member_profile(uuid, text, text, int) to authenticated;

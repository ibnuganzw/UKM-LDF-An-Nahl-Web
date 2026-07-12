-- Phase 8: People inside a division (division_members).
--
-- Apply on the hosted project via the SQL Editor (this project has no CLI wired
-- up — see the supabase-deploy-workflow memory), then verify with the anon-key
-- probe script.
--
-- Until now org_positions only held a division's identity (name/desc/color) as a
-- tier-3 row with position_key NULL. This adds the actual people in a division —
-- a head (ketua), optional officers (wakil/sekretaris/bendahara), and members
-- (anggota) — as child rows pointing at that division row.

create type public.division_role as enum ('ketua', 'wakil', 'sekretaris', 'bendahara', 'anggota');

create table public.division_members (
  id uuid primary key default gen_random_uuid(),
  -- Points at the DIVISI row in org_positions (tier 3, position_key NULL).
  -- Cascade so deleting a division cleans up its people automatically.
  division_id uuid not null references public.org_positions(id) on delete cascade,
  name text not null,
  role public.division_role not null default 'anggota',
  photo_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index division_members_div_sort_idx on public.division_members (division_id, sort_order);

-- Flexible on purpose: unlimited 'anggota', but at most one ketua/wakil/
-- sekretaris/bendahara per division. NULL-free partial unique index — anggota
-- rows are excluded so they never collide.
create unique index division_members_one_officer_per_role
  on public.division_members (division_id, role)
  where role <> 'anggota';

alter table public.division_members enable row level security;

-- Public read (the Profil org chart is unauthenticated). Same policy shape as
-- org_positions; writes are admin-only via private.is_active_admin() (Phase 1).
create policy "division_members_select_all" on public.division_members
  for select to anon, authenticated using (true);

create policy "division_members_insert_admin" on public.division_members
  for insert to authenticated with check (private.is_active_admin());

create policy "division_members_update_admin" on public.division_members
  for update to authenticated using (private.is_active_admin()) with check (private.is_active_admin());

create policy "division_members_delete_admin" on public.division_members
  for delete to authenticated using (private.is_active_admin());

-- Integrity guard: division_id must reference an actual DIVISI row (position_key
-- NULL), never a core leadership row. RLS already limits writes to admins, but
-- this closes the "attach a person to Ketua Umum" mistake at the data layer.
create or replace function public.enforce_division_member_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.org_positions op
    where op.id = new.division_id and op.position_key is null
  ) then
    raise exception 'Anggota hanya dapat ditautkan ke baris divisi';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_division_member_parent
  before insert or update on public.division_members
  for each row execute function public.enforce_division_member_parent();

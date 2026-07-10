-- Phase 5: Org Structure CMS
-- See plan: C:\Users\ibnuh\.claude\plans\mellow-conjuring-bunny.md

create type public.org_position_key as enum ('dosen_pembina', 'ketua_umum', 'sekretaris_umum', 'bendahara_umum');

-- position_key is NULL for divisi rows (flexible, many) and set to one of the
-- 4 fixed values for the core leadership rows (exactly one row each, enforced
-- by the unique constraint — NULL is never considered equal to NULL under a
-- standard unique constraint, so multiple divisi rows with NULL are fine).
-- tier buckets rows into the visual layout: 0 = dosen pembina, 1 = ketua umum,
-- 2 = sekretaris/bendahara umum, 3 = divisi.
create table public.org_positions (
  id uuid primary key default gen_random_uuid(),
  position_key public.org_position_key unique,
  tier int not null,
  name text not null,
  role_title text,
  division_desc text,
  division_color text check (division_color ~ '^#[0-9A-Fa-f]{6}$'),
  photo_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (
    (position_key is not null and role_title is not null)
    or
    (position_key is null and division_desc is not null and division_color is not null)
  )
);

alter table public.org_positions enable row level security;

-- Public read (Profil page is unauthenticated).
create policy "org_positions_select_all" on public.org_positions
  for select to anon, authenticated using (true);

create policy "org_positions_insert_admin" on public.org_positions
  for insert to authenticated with check (private.is_active_admin());

create policy "org_positions_update_admin" on public.org_positions
  for update to authenticated using (private.is_active_admin()) with check (private.is_active_admin());

create policy "org_positions_delete_admin" on public.org_positions
  for delete to authenticated using (private.is_active_admin());

-- Same pattern as protect_super_admin() in Phase 1: a core row (position_key
-- set) can have its name/role_title/photo freely edited, but its identity
-- (position_key) and layout tier can't be changed, and it can't be deleted —
-- closing the "retier to divisi, then delete" loophole.
create or replace function public.protect_core_positions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.position_key is not null then
      raise exception 'Posisi inti tidak dapat dihapus';
    end if;
    return old;
  end if;

  if old.position_key is not null then
    if new.position_key is distinct from old.position_key then
      raise exception 'Kunci posisi inti tidak dapat diubah';
    end if;
    if new.tier is distinct from old.tier then
      raise exception 'Tier posisi inti tidak dapat diubah';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_core_positions_update
  before update on public.org_positions
  for each row execute function public.protect_core_positions();

create trigger trg_protect_core_positions_delete
  before delete on public.org_positions
  for each row execute function public.protect_core_positions();

-- ============================================================================
-- Storage: org-photos bucket. Public read, admin-only write.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('org-photos', 'org-photos', true)
on conflict (id) do nothing;

create policy "org_photos_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'org-photos');

create policy "org_photos_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-photos' and private.is_active_admin());

create policy "org_photos_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'org-photos' and private.is_active_admin())
  with check (bucket_id = 'org-photos' and private.is_active_admin());

create policy "org_photos_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'org-photos' and private.is_active_admin());

-- ============================================================================
-- Seed: migrates the placeholder data that used to live in web/src/data/org.ts
-- (KETUA_UMUM/STRUKTUR_INTI/STRUKTUR_DEPT), plus a new Dosen Pembina row.
-- ============================================================================
insert into public.org_positions (position_key, tier, name, role_title, sort_order) values
  ('dosen_pembina', 0, 'Nama Dosen Pembina', 'Dosen Pembina', 0),
  ('ketua_umum', 1, 'Nama Ketua Umum', 'Ketua Umum', 0),
  ('sekretaris_umum', 2, 'Nama Pengurus', 'Sekretaris Umum', 0),
  ('bendahara_umum', 2, 'Nama Pengurus', 'Bendahara Umum', 1);

insert into public.org_positions (tier, name, division_desc, division_color, sort_order) values
  (3, 'Kaderisasi', 'Mentoring pekanan & pembinaan anggota berjenjang.', '#5CCBA0', 0),
  (3, 'Syiar', 'Kajian rutin, PHBI, dan dakwah kreatif kampus.', '#8FAAF5', 1),
  (3, 'Media & Informasi', 'Konten dakwah, publikasi, dan pengelolaan media sosial.', '#5FC6DE', 2),
  (3, 'Dana & Usaha', 'Kemandirian finansial melalui usaha halal.', '#E8C766', 3),
  (3, 'Kemuslimahan', 'Pembinaan dan kegiatan khusus muslimah FKH.', '#EE9AC0', 4),
  (3, 'Biro Kemushallaan', 'Kemakmuran, kebersihan, dan fasilitas mushalla.', '#C39BE8', 5);

-- Phase 13: apply an admin-reviewed organisational structure parsed from DOCX.
--
-- The browser only prepares a preview. This RPC performs the actual replacement
-- atomically after the authenticated administrator confirms it, so a half-saved
-- chart can never reach the public profile page.

create or replace function public.apply_org_structure_import(
  p_core jsonb,
  p_divisions jsonb
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_core_key public.org_position_key;
  v_core_value jsonb;
  v_division jsonb;
  v_member jsonb;
  v_division_id uuid;
  v_seen_division_ids uuid[] := array[]::uuid[];
  v_removed_photo_urls text[] := array[]::text[];
  v_member_photos text[];
  v_division_index integer := 0;
  v_name text;
  v_description text;
  v_color text;
begin
  if not private.is_active_admin() then
    raise exception 'Hanya admin aktif yang dapat menerapkan struktur organisasi';
  end if;

  if jsonb_typeof(p_core) <> 'object' or jsonb_typeof(p_divisions) <> 'array' then
    raise exception 'Format impor struktur tidak valid';
  end if;

  if jsonb_array_length(p_divisions) = 0 then
    raise exception 'Impor harus memuat setidaknya satu divisi';
  end if;

  if jsonb_array_length(p_divisions) > 40 then
    raise exception 'Impor dibatasi sampai 40 divisi';
  end if;

  if exists (
    select 1
    from (
      select lower(regexp_replace(trim(value ->> 'name'), '\s+', ' ', 'g')) as normalized_name, count(*)
      from jsonb_array_elements(p_divisions)
      group by 1
      having count(*) > 1
    ) duplicate_divisions
  ) then
    raise exception 'Nama divisi tidak boleh duplikat';
  end if;

  for v_division in select value from jsonb_array_elements(p_divisions)
  loop
    v_name := trim(v_division ->> 'name');
    v_description := trim(v_division ->> 'description');
    v_color := trim(v_division ->> 'color');

    if v_name = '' or char_length(v_name) > 160 then
      raise exception 'Nama divisi wajib diisi dan maksimal 160 karakter';
    end if;
    if v_description = '' or char_length(v_description) > 500 then
      raise exception 'Deskripsi divisi wajib diisi dan maksimal 500 karakter';
    end if;
    if v_color !~ '^#[0-9A-Fa-f]{6}$' then
      raise exception 'Warna divisi tidak valid';
    end if;
    if jsonb_typeof(v_division -> 'members') <> 'array' then
      raise exception 'Daftar anggota divisi tidak valid';
    end if;
    if jsonb_array_length(v_division -> 'members') > 150 then
      raise exception 'Satu divisi dibatasi sampai 150 orang';
    end if;

    if exists (
      select 1
      from (
        select trim(member.value ->> 'role') as role_name, count(*)
        from jsonb_array_elements(v_division -> 'members') member
        where trim(member.value ->> 'role') <> 'anggota'
        group by 1
        having count(*) > 1
      ) duplicate_officers
    ) then
      raise exception 'Satu jabatan inti divisi hanya boleh diisi satu orang';
    end if;

    for v_member in select value from jsonb_array_elements(v_division -> 'members')
    loop
      if trim(v_member ->> 'name') = '' or char_length(trim(v_member ->> 'name')) > 160 then
        raise exception 'Nama pengurus atau anggota wajib diisi dan maksimal 160 karakter';
      end if;
      if trim(v_member ->> 'role') not in ('ketua', 'wakil', 'sekretaris', 'bendahara', 'anggota') then
        raise exception 'Jabatan divisi tidak valid';
      end if;
    end loop;
  end loop;

  foreach v_core_key in array array[
    'dosen_pembina'::public.org_position_key,
    'ketua_umum'::public.org_position_key,
    'sekretaris_umum'::public.org_position_key,
    'bendahara_umum'::public.org_position_key
  ]
  loop
    v_core_value := p_core -> v_core_key::text;
    if v_core_value is null then
      continue;
    end if;
    if trim(v_core_value ->> 'name') = '' or char_length(trim(v_core_value ->> 'name')) > 160 then
      raise exception 'Nama posisi inti tidak valid';
    end if;

    update public.org_positions
    set name = trim(v_core_value ->> 'name'),
        role_title = coalesce(nullif(trim(v_core_value ->> 'role_title'), ''), replace(v_core_key::text, '_', ' '))
    where position_key = v_core_key;
  end loop;

  for v_division in select value from jsonb_array_elements(p_divisions)
  loop
    v_name := trim(v_division ->> 'name');
    v_description := trim(v_division ->> 'description');
    v_color := trim(v_division ->> 'color');

    select id into v_division_id
    from public.org_positions
    where position_key is null
      and lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower(regexp_replace(v_name, '\s+', ' ', 'g'))
    limit 1;

    if v_division_id is null then
      insert into public.org_positions (tier, name, division_desc, division_color, sort_order)
      values (3, v_name, v_description, v_color, v_division_index)
      returning id into v_division_id;
    else
      select coalesce(array_agg(photo_url) filter (where photo_url is not null), array[]::text[])
      into v_member_photos
      from public.division_members
      where division_id = v_division_id;
      v_removed_photo_urls := v_removed_photo_urls || v_member_photos;

      delete from public.division_members where division_id = v_division_id;
      update public.org_positions
      set name = v_name, division_desc = v_description, division_color = v_color, sort_order = v_division_index
      where id = v_division_id;
    end if;

    v_seen_division_ids := array_append(v_seen_division_ids, v_division_id);

    for v_member in select value from jsonb_array_elements(v_division -> 'members')
    loop
      insert into public.division_members (division_id, name, role, sort_order)
      values (
        v_division_id,
        trim(v_member ->> 'name'),
        (trim(v_member ->> 'role'))::public.division_role,
        coalesce((v_member ->> 'sort_order')::integer, 0)
      );
    end loop;

    v_division_index := v_division_index + 1;
  end loop;

  for v_division_id, v_name in
    select id, photo_url from public.org_positions
    where position_key is null and id <> all(v_seen_division_ids)
  loop
    if v_name is not null then
      v_removed_photo_urls := array_append(v_removed_photo_urls, v_name);
    end if;
    select coalesce(array_agg(photo_url) filter (where photo_url is not null), array[]::text[])
    into v_member_photos
    from public.division_members
    where division_id = v_division_id;
    v_removed_photo_urls := v_removed_photo_urls || v_member_photos;
    delete from public.org_positions where id = v_division_id;
  end loop;

  return array_remove(v_removed_photo_urls, null);
end;
$$;

revoke all on function public.apply_org_structure_import(jsonb, jsonb) from public, anon;
grant execute on function public.apply_org_structure_import(jsonb, jsonb) to authenticated;

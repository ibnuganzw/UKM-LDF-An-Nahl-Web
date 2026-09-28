-- Public URLs keep working because both buckets are public.  A SELECT policy
-- without an operation check also permits object.list, exposing filenames and
-- metadata even for images that have not been linked from a published page.
-- Keep SELECT for active admins so the editor can browse and upsert images.
drop policy if exists "article_images_public_read" on storage.objects;
drop policy if exists "org_photos_public_read" on storage.objects;

create policy "article_images_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'article-images' and private.is_active_admin());

create policy "org_photos_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'org-photos' and private.is_active_admin());

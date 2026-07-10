-- Fix: articles_select_published_or_admin (Phase 4) was granted `to anon,
-- authenticated` while referencing private.is_active_admin() in the same
-- USING clause. anon never has EXECUTE on that function (deliberately
-- revoked in Phase 1 — every other usage of it is authenticated-only), so
-- ANY anon select against articles failed outright with "permission denied
-- for function is_active_admin" (42501), regardless of the row's actual
-- status. This meant the public Konten/Artikel pages never actually worked
-- for signed-out visitors since the Phase 4 migration was applied.
--
-- Splitting into two OR'd policies lets anon's branch never reference the
-- admin-check function at all, instead of widening that function's grant.
-- Postgres combines multiple permissive policies for the same command with
-- OR, so authenticated callers still get published-OR-admin exactly as
-- before; anon callers only ever evaluate the first (status = 'published').
drop policy if exists "articles_select_published_or_admin" on public.articles;

create policy "articles_select_published" on public.articles
  for select to anon, authenticated
  using (status = 'published');

create policy "articles_select_admin" on public.articles
  for select to authenticated
  using (private.is_active_admin());

-- Phase 4: Article CMS
-- See plan: C:\Users\ibnuh\.claude\plans\mellow-conjuring-bunny.md

-- article_category is a closed enum (unlike agendas.type, which is free text)
-- because these 3 pillars are baked into the site's content structure/colors
-- (lib/colors.ts CATEGORY_COLORS, Konten.tsx filter chips) — not expected to grow.
create type public.article_category as enum ('Islam Veteriner', 'Kisah', 'Renungan');
create type public.article_status as enum ('draft', 'published');

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category public.article_category not null,
  title text not null,
  excerpt text not null,
  content_html text not null,
  cover_image_url text,
  status public.article_status not null default 'draft',
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.articles enable row level security;

-- Public read only sees published rows; admins see everything (drafts included,
-- needed for the admin list/editor pages).
create policy "articles_select_published_or_admin" on public.articles
  for select to anon, authenticated
  using (status = 'published' or private.is_active_admin());

create policy "articles_insert_admin" on public.articles
  for insert to authenticated with check (private.is_active_admin());

create policy "articles_update_admin" on public.articles
  for update to authenticated using (private.is_active_admin()) with check (private.is_active_admin());

create policy "articles_delete_admin" on public.articles
  for delete to authenticated using (private.is_active_admin());

-- Keeps updated_at current and stamps published_at the moment a row first
-- becomes (or becomes again) published, without touching it on unpublish —
-- so "last published" history survives a draft/republish cycle.
create or replace function public.set_article_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  -- OLD is unassigned (not merely null) on INSERT — branch on tg_op explicitly
  -- rather than reference old.status inside a combined boolean expression.
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      new.published_at = now();
    end if;
  else
    if new.status = 'published' and old.status is distinct from 'published' then
      new.published_at = now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_articles_set_timestamps
  before insert or update on public.articles
  for each row execute function public.set_article_timestamps();

-- ============================================================================
-- Storage: article-images bucket. Public read (published articles show images
-- to anon visitors), writes restricted to active admins.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

create policy "article_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'article-images');

create policy "article_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'article-images' and private.is_active_admin());

create policy "article_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'article-images' and private.is_active_admin())
  with check (bucket_id = 'article-images' and private.is_active_admin());

create policy "article_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'article-images' and private.is_active_admin());

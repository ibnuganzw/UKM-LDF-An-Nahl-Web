-- Phase 9: editorial trust metadata and publication guardrails.
--
-- Constraints are added NOT VALID so legacy published rows remain readable.
-- PostgreSQL still enforces them for every new or updated row.

alter table public.articles
  add column if not exists dek text not null default '',
  add column if not exists topics text[] not null default '{}',
  add column if not exists author_name text not null default 'Tim Media An-Nahl',
  add column if not exists author_role text not null default 'Tim Media LDF An-Nahl',
  add column if not exists scientific_reviewer_name text,
  add column if not exists scientific_reviewer_role text,
  add column if not exists sharia_reviewer_name text,
  add column if not exists sharia_reviewer_role text,
  add column if not exists review_status text not null default 'unreviewed',
  add column if not exists reviewed_at timestamptz,
  add column if not exists verification_summary text,
  add column if not exists cover_image_alt text not null default '',
  add column if not exists cover_image_caption text,
  add column if not exists is_featured boolean not null default false;

alter table public.articles
  add constraint articles_review_status_check
  check (review_status in ('unreviewed', 'in_review', 'reviewed'))
  not valid;

alter table public.articles
  add constraint articles_topics_limit_check
  check (cardinality(topics) <= 8)
  not valid;

alter table public.articles
  add constraint articles_reviewed_contributors_check
  check (
    review_status <> 'reviewed'
    or (
      nullif(btrim(scientific_reviewer_name), '') is not null
      and nullif(btrim(sharia_reviewer_name), '') is not null
    )
  )
  not valid;

alter table public.articles
  add constraint articles_islam_veteriner_publish_check
  check (
    status <> 'published'
    or category <> 'Islam Veteriner'
    or review_status = 'reviewed'
  )
  not valid;

create unique index if not exists articles_one_published_featured_idx
  on public.articles (is_featured)
  where is_featured = true and status = 'published';

create index if not exists articles_topics_idx
  on public.articles using gin (topics);

create or replace function public.set_article_reviewed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.review_status = 'reviewed' and (
    tg_op = 'INSERT'
    or old.review_status is distinct from 'reviewed'
    or new.reviewed_at is null
  ) then
    new.reviewed_at := now();
  elsif new.review_status <> 'reviewed' then
    new.reviewed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_article_reviewed_at on public.articles;
create trigger set_article_reviewed_at
before insert or update of review_status, reviewed_at
on public.articles
for each row execute function public.set_article_reviewed_at();

comment on column public.articles.dek is
  'Short editorial standfirst displayed beneath the title.';
comment on column public.articles.verification_summary is
  'Plain-language scope and method of the editorial verification.';
comment on column public.articles.review_status is
  'Editorial state: unreviewed, in_review, or reviewed.';
comment on column public.articles.is_featured is
  'Only one published article may be the primary featured story.';

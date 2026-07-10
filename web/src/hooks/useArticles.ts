import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Article, ArticleCategory, ArticleStatus, EnrichedArticle } from '../types';
import { estimateReadMins } from '../lib/readingTime';
import { supabase } from '../lib/supabaseClient';

interface ArticleRow {
  id: string;
  slug: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  content_html: string;
  cover_image_url: string | null;
  status: ArticleStatus;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    cat: row.category,
    title: row.title,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function enrich(article: Article): EnrichedArticle {
  return { ...article, mins: estimateReadMins(article.contentHtml) };
}

export interface ArticleCollections {
  all: EnrichedArticle[];
  bySlug: (slug: string | null | undefined) => EnrichedArticle | undefined;
  loading: boolean;
  refresh: () => void;
}

/** Public-facing collection: published articles only. Admin pages query
 *  `articles` directly (like AdminAnggota.tsx does for profiles) since they
 *  also need to see drafts. */
export function useArticles(): ArticleCollections {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('articles')
      .select(
        'id, slug, category, title, excerpt, content_html, cover_image_url, status, author_id, created_at, updated_at, published_at',
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    setArticles(((data as ArticleRow[] | null) ?? []).map(toArticle));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return useMemo(() => {
    const all = articles.map(enrich);
    const bySlug = (slug: string | null | undefined) => all.find((a) => a.slug === slug);
    return { all, bySlug, loading, refresh };
  }, [articles, loading, refresh]);
}

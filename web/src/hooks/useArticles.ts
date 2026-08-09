import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Article,
  ArticleCategory,
  ArticleReviewStatus,
  ArticleStatus,
  EnrichedArticle,
} from '../types';
import { estimateReadMins } from '../lib/readingTime';
import {
  ARTICLE_EDITORIAL_COLUMNS,
  ARTICLE_LEGACY_COLUMNS,
  isEditorialSchemaUnavailable,
} from '../lib/articleSchema';
import { supabase } from '../lib/supabaseClient';

interface ArticleRow {
  id: string;
  slug: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  dek?: string | null;
  topics?: string[] | null;
  content_html: string;
  cover_image_url: string | null;
  cover_image_alt?: string | null;
  cover_image_caption?: string | null;
  status: ArticleStatus;
  author_id: string | null;
  author_name?: string | null;
  author_role?: string | null;
  scientific_reviewer_name?: string | null;
  scientific_reviewer_role?: string | null;
  sharia_reviewer_name?: string | null;
  sharia_reviewer_role?: string | null;
  review_status?: ArticleReviewStatus | null;
  reviewed_at?: string | null;
  verification_summary?: string | null;
  is_featured?: boolean | null;
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
    dek: row.dek ?? '',
    topics: row.topics ?? [],
    contentHtml: row.content_html,
    coverImageUrl: row.cover_image_url,
    coverImageAlt: row.cover_image_alt ?? '',
    coverImageCaption: row.cover_image_caption ?? null,
    status: row.status,
    authorId: row.author_id,
    authorName: row.author_name?.trim() || 'Tim Media An-Nahl',
    authorRole: row.author_role?.trim() || 'Tim Media LDF An-Nahl',
    scientificReviewerName: row.scientific_reviewer_name ?? null,
    scientificReviewerRole: row.scientific_reviewer_role ?? null,
    shariaReviewerName: row.sharia_reviewer_name ?? null,
    shariaReviewerRole: row.sharia_reviewer_role ?? null,
    reviewStatus: row.review_status ?? 'unreviewed',
    reviewedAt: row.reviewed_at ?? null,
    verificationSummary: row.verification_summary ?? null,
    isFeatured: row.is_featured ?? false,
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
  error: string | null;
  refresh: () => void;
}

/** Public-facing collection: published articles only. Admin pages query
 *  `articles` directly (like AdminAnggota.tsx does for profiles) since they
 *  also need to see drafts. */
export function useArticles(): ArticleCollections {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = (columns: string) =>
        supabase
          .from('articles')
          .select(columns)
          .eq('status', 'published')
          .order('published_at', { ascending: false });

      let { data, error: queryError } = await query(ARTICLE_EDITORIAL_COLUMNS);
      if (isEditorialSchemaUnavailable(queryError)) {
        const fallback = await query(ARTICLE_LEGACY_COLUMNS);
        data = fallback.data;
        queryError = fallback.error;
      }
      if (queryError) throw queryError;
      setArticles(((data as ArticleRow[] | null) ?? []).map(toArticle));
      setError(null);
    } catch {
      setError('Tulisan belum dapat dimuat. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return useMemo(() => {
    const all = articles.map(enrich);
    const bySlug = (slug: string | null | undefined) => all.find((a) => a.slug === slug);
    return { all, bySlug, loading, error, refresh };
  }, [articles, loading, error, refresh]);
}

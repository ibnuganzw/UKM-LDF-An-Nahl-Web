import type {
  ArticleCategory,
  ArticleReviewStatus,
  ArticleStatus,
  EnrichedArticle,
} from '../types';
import { parseTopicsInput } from './articleEditorial';
import { estimateReadMins } from './readingTime';

export interface ArticlePreviewInput {
  slug: string;
  category: ArticleCategory;
  status: ArticleStatus;
  title: string;
  excerpt: string;
  dek: string;
  topicsInput: string;
  contentHtml: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  coverImageCaption: string;
  authorName: string;
  authorRole: string;
  scientificReviewerName: string;
  scientificReviewerRole: string;
  shariaReviewerName: string;
  shariaReviewerRole: string;
  reviewStatus: ArticleReviewStatus;
  verificationSummary: string;
  isFeatured: boolean;
}

const EMPTY_CONTENT = '<p>Isi tulisan akan tampil di sini setelah kamu mulai menulis.</p>';

export function buildArticlePreview(input: ArticlePreviewInput, now = new Date()): EnrichedArticle {
  const timestamp = now.toISOString();
  const contentHtml = input.contentHtml.trim() || EMPTY_CONTENT;

  return {
    id: 'admin-preview',
    slug: input.slug.trim() || 'pratinjau',
    cat: input.category,
    title: input.title.trim() || 'Judul tulisan akan tampil di sini',
    excerpt: input.excerpt.trim() || 'Ringkasan tulisan akan tampil di sini.',
    dek: input.dek.trim(),
    topics: parseTopicsInput(input.topicsInput),
    contentHtml,
    coverImageUrl: input.coverImageUrl,
    coverImageAlt: input.coverImageAlt.trim(),
    coverImageCaption: input.coverImageCaption.trim() || null,
    status: input.status,
    authorId: null,
    authorName: input.authorName.trim() || 'Tim Media An-Nahl',
    authorRole: input.authorRole.trim() || 'Tim Media LDF An-Nahl',
    scientificReviewerName: input.scientificReviewerName.trim() || null,
    scientificReviewerRole: input.scientificReviewerRole.trim() || null,
    shariaReviewerName: input.shariaReviewerName.trim() || null,
    shariaReviewerRole: input.shariaReviewerRole.trim() || null,
    reviewStatus: input.reviewStatus,
    reviewedAt: null,
    verificationSummary: input.verificationSummary.trim() || null,
    isFeatured: input.isFeatured,
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: input.status === 'published' ? timestamp : null,
    mins: estimateReadMins(contentHtml),
  };
}

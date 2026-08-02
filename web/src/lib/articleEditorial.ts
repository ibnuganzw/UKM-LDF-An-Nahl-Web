import type {
  ArticleCategory,
  ArticleReviewStatus,
  EditorialBlockKind,
  EnrichedArticle,
} from '../types';

export const EDITORIAL_BLOCKS: ReadonlyArray<{
  kind: EditorialBlockKind;
  label: string;
  description: string;
}> = [
  { kind: 'dalil', label: 'Dalil Al-Qur\'an', description: 'Ayat dan konteks penafsirannya.' },
  { kind: 'hadis', label: 'Hadis', description: 'Riwayat, derajat, dan konteks pemaknaan.' },
  { kind: 'khilaf', label: 'Khilaf & Fikih', description: 'Ragam pandangan dan batas kesimpulan.' },
  { kind: 'bukti-ilmiah', label: 'Bukti Ilmiah', description: 'Temuan veteriner dan mutu buktinya.' },
  { kind: 'keselamatan', label: 'Catatan Keselamatan', description: 'Risiko, batas penggunaan, dan kewaspadaan.' },
  { kind: 'kesimpulan', label: 'Kesimpulan', description: 'Sikap akhir tulisan secara tegas dan proporsional.' },
  { kind: 'referensi', label: 'Referensi', description: 'Sumber ilmiah, kitab, dan dokumen primer.' },
];

export const REVIEW_STATUS_LABELS: Record<ArticleReviewStatus, string> = {
  unreviewed: 'Belum ditelaah',
  in_review: 'Sedang ditelaah',
  reviewed: 'Telah ditelaah',
};

export function parseTopicsInput(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((topic) => topic.trim())
    .filter((topic) => {
      const key = topic.toLocaleLowerCase('id-ID');
      if (!topic || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export interface PublicationAssessment {
  allowed: boolean;
  reason: string | null;
}

export function assessArticlePublication(input: {
  category: ArticleCategory;
  status: 'draft' | 'published';
  reviewStatus: ArticleReviewStatus;
  scientificReviewerName: string;
  shariaReviewerName: string;
}): PublicationAssessment {
  if (input.status !== 'published') return { allowed: true, reason: null };

  if (input.category === 'Islam Veteriner' && input.reviewStatus !== 'reviewed') {
    return {
      allowed: false,
      reason: 'Tulisan Islam Veteriner harus berstatus “Telah ditelaah” sebelum diterbitkan.',
    };
  }

  if (
    input.reviewStatus === 'reviewed' &&
    (!input.scientificReviewerName.trim() || !input.shariaReviewerName.trim())
  ) {
    return {
      allowed: false,
      reason: 'Nama penelaah ilmiah dan penelaah syariah wajib diisi untuk status “Telah ditelaah”.',
    };
  }

  return { allowed: true, reason: null };
}

export interface ArticleHierarchy<T> {
  featured: T | null;
  secondary: T[];
  archive: T[];
}

export function organizeArticles<T extends Pick<EnrichedArticle, 'isFeatured'>>(
  articles: readonly T[],
): ArticleHierarchy<T> {
  if (articles.length === 0) return { featured: null, secondary: [], archive: [] };

  const explicitFeaturedIndex = articles.findIndex((article) => article.isFeatured);
  const featuredIndex = explicitFeaturedIndex >= 0 ? explicitFeaturedIndex : 0;
  const featured = articles[featuredIndex] ?? null;
  const remaining = articles.filter((_, index) => index !== featuredIndex);

  return {
    featured,
    secondary: remaining.slice(0, 2),
    archive: remaining.slice(2),
  };
}

function normalizeHeading(value: string): string {
  return value
    .toLocaleLowerCase('id-ID')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function classifyEditorialHeading(heading: string): EditorialBlockKind | null {
  const normalized = normalizeHeading(heading);
  if (!normalized) return null;

  if (/^(dalil|ayat|dalil al quran|landasan al quran)/.test(normalized)) return 'dalil';
  if (/^(hadis|hadits|sunnah|riwayat)/.test(normalized)) return 'hadis';
  if (/^(khilaf|ikhtilaf|fikih|fiqih|pandangan ulama)/.test(normalized)) return 'khilaf';
  if (/^(bukti ilmiah|perspektif veteriner|tinjauan veteriner|kajian ilmiah|sains)/.test(normalized)) {
    return 'bukti-ilmiah';
  }
  if (/^(catatan keselamatan|keselamatan|peringatan|toksikologi|risiko)/.test(normalized)) {
    return 'keselamatan';
  }
  if (/^(kesimpulan|penutup|sikap akhir)/.test(normalized)) return 'kesimpulan';
  if (/^(referensi|daftar pustaka|rujukan|sumber)/.test(normalized)) return 'referensi';
  return null;
}

export function editorialBlockLabel(kind: EditorialBlockKind): string {
  return EDITORIAL_BLOCKS.find((block) => block.kind === kind)?.label ?? kind;
}

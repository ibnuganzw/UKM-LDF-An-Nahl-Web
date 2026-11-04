import { describe, expect, it } from 'vitest';
import { buildArticlePreview, type ArticlePreviewInput } from './articlePreview';

const baseInput: ArticlePreviewInput = {
  slug: '',
  category: 'Islam Veteriner',
  status: 'draft',
  title: '',
  excerpt: '',
  dek: '',
  topicsInput: '',
  contentHtml: '',
  coverImageUrl: null,
  coverImageAlt: '',
  coverImageCaption: '',
  authorName: '',
  authorRole: '',
  scientificReviewerName: '',
  scientificReviewerRole: '',
  shariaReviewerName: '',
  shariaReviewerRole: '',
  reviewStatus: 'unreviewed',
  verificationSummary: '',
  isFeatured: false,
};

describe('article preview model', () => {
  it('provides readable placeholders without changing publication state', () => {
    const preview = buildArticlePreview(baseInput, new Date('2026-08-20T08:00:00.000Z'));

    expect(preview.title).toBe('Judul tulisan akan tampil di sini');
    expect(preview.contentHtml).toContain('Isi tulisan akan tampil di sini');
    expect(preview.status).toBe('draft');
    expect(preview.publishedAt).toBeNull();
    expect(preview.authorName).toBe('Tim Media An-Nahl');
    expect(preview.mins).toBe(1);
  });

  it('normalizes editorial metadata through the same topic and reading-time contracts', () => {
    const contentHtml = `<p>${'amanah '.repeat(420)}</p>`;
    const preview = buildArticlePreview({
      ...baseInput,
      status: 'published',
      title: '  Amanah Profesi  ',
      topicsInput: 'Fikih Hewan, zoonosis, fikih hewan',
      contentHtml,
      authorName: '  Tim Penulis  ',
      scientificReviewerName: '  drh. Nadia  ',
      reviewStatus: 'reviewed',
    }, new Date('2026-08-20T08:00:00.000Z'));

    expect(preview.title).toBe('Amanah Profesi');
    expect(preview.topics).toEqual(['Fikih Hewan', 'zoonosis']);
    expect(preview.authorName).toBe('Tim Penulis');
    expect(preview.scientificReviewerName).toBe('drh. Nadia');
    expect(preview.publishedAt).toBe('2026-08-20T08:00:00.000Z');
    expect(preview.mins).toBe(2);
  });
});

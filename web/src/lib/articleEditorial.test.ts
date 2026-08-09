import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assessArticlePublication,
  classifyEditorialHeading,
  organizeArticles,
  parseTopicsInput,
} from './articleEditorial';

describe('Phase 1 editorial contracts', () => {
  it('blocks an Islam Veteriner article until both review tracks are complete', () => {
    expect(assessArticlePublication({
      category: 'Islam Veteriner',
      status: 'published',
      reviewStatus: 'in_review',
      scientificReviewerName: 'drh. Nadia',
      shariaReviewerName: 'Ustaz Rahman',
    })).toMatchObject({ allowed: false });

    expect(assessArticlePublication({
      category: 'Islam Veteriner',
      status: 'published',
      reviewStatus: 'reviewed',
      scientificReviewerName: 'drh. Nadia',
      shariaReviewerName: '',
    })).toMatchObject({ allowed: false });

    expect(assessArticlePublication({
      category: 'Islam Veteriner',
      status: 'published',
      reviewStatus: 'reviewed',
      scientificReviewerName: 'drh. Nadia',
      shariaReviewerName: 'Ustaz Rahman',
    })).toEqual({ allowed: true, reason: null });
  });

  it('keeps explicit featured priority without duplicating it in later tiers', () => {
    const articles = [
      { id: 'a', isFeatured: false },
      { id: 'b', isFeatured: false },
      { id: 'c', isFeatured: true },
      { id: 'd', isFeatured: false },
      { id: 'e', isFeatured: false },
    ];
    const result = organizeArticles(articles);

    expect(result.featured?.id).toBe('c');
    expect(result.secondary.map((article) => article.id)).toEqual(['a', 'b']);
    expect(result.archive.map((article) => article.id)).toEqual(['d', 'e']);
  });

  it('deduplicates and limits comma-separated topics', () => {
    expect(parseTopicsInput('Fikih Hewan, zoonosis, fikih hewan, Etika, Satu, Dua, Tiga, Empat, Lima, Enam'))
      .toEqual(['Fikih Hewan', 'zoonosis', 'Etika', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima']);
  });

  it('maps common Word headings into the intended semantic sections', () => {
    expect(classifyEditorialHeading('Dalil Al-Qur’an')).toBe('dalil');
    expect(classifyEditorialHeading('Hadits dan Konteksnya')).toBe('hadis');
    expect(classifyEditorialHeading('Pandangan Ulama')).toBe('khilaf');
    expect(classifyEditorialHeading('Perspektif Veteriner')).toBe('bukti-ilmiah');
    expect(classifyEditorialHeading('Catatan Keselamatan')).toBe('keselamatan');
    expect(classifyEditorialHeading('Daftar Pustaka')).toBe('referensi');
    expect(classifyEditorialHeading('Kisah di Lapangan')).toBeNull();
  });

  it('keeps semantic sections inside the public sanitizer contract', () => {
    const sanitizer = readFileSync(new URL('./sanitizeHtml.ts', import.meta.url), 'utf8');
    expect(sanitizer).toContain("'section'");
    expect(sanitizer).toContain("'data-editorial-block'");
    expect(sanitizer).not.toContain("'script'");
  });

  it('backs the client publication check with database constraints', () => {
    const migration = readFileSync(
      new URL('../../supabase/migrations/20260802090000_phase9_article_editorial_trust.sql', import.meta.url),
      'utf8',
    );
    expect(migration).toContain('articles_islam_veteriner_publish_check');
    expect(migration).toContain('articles_reviewed_contributors_check');
    expect(migration).toContain('articles_one_published_featured_idx');
  });
});

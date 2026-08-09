import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  absoluteSiteUrl,
  createArticleStructuredData,
  createBreadcrumbStructuredData,
  createEventStructuredData,
  createWebPageStructuredData,
  getRouteSeo,
} from './seo';

const ORIGIN = 'https://annahl.example';

describe('Phase 2 discovery contracts', () => {
  it('keeps public discovery routes indexable with route-specific copy', () => {
    expect(getRouteSeo('/profil')).toMatchObject({
      title: 'Profil & Struktur',
      path: '/profil',
      noIndex: false,
      noFollow: false,
    });
    expect(getRouteSeo('/quran/16')).toMatchObject({
      title: 'Surah 16',
      path: '/quran/16',
      noIndex: false,
    });
    expect(getRouteSeo('/quran/juz/30')).toMatchObject({
      title: 'Juz 30',
      path: '/quran/juz/30',
      noIndex: false,
    });
  });

  it('keeps private, utility, unresolved detail, and unknown routes out of the index', () => {
    expect(getRouteSeo('/admin/artikel')).toMatchObject({ noIndex: true, noFollow: true });
    expect(getRouteSeo('/login')).toMatchObject({ noIndex: true, noFollow: true });
    expect(getRouteSeo('/konten/belum-terverifikasi')).toMatchObject({ noIndex: true });
    expect(getRouteSeo('/agenda/belum-terverifikasi')).toMatchObject({ noIndex: true });
    expect(getRouteSeo('/rute-tidak-ada')).toMatchObject({ noIndex: true });
  });

  it('normalizes canonical URLs against the configured production origin', () => {
    expect(absoluteSiteUrl('/quran/16', `${ORIGIN}/`)).toBe(`${ORIGIN}/quran/16`);
    expect(absoluteSiteUrl('assets/og-card.jpg', ORIGIN)).toBe(`${ORIGIN}/assets/og-card.jpg`);
  });

  it('publishes trust-bearing Article structured data', () => {
    const schema = createArticleStructuredData({
      path: '/konten/amanah-dokter-hewan',
      title: 'Amanah Dokter Hewan',
      description: 'Iman, ilmu, dan tanggung jawab profesi.',
      authorName: 'Tim Islam Veteriner',
      category: 'Islam Veteriner',
      topics: ['Etika', 'Veteriner'],
      publishedAt: '2026-08-03T08:00:00Z',
      updatedAt: '2026-08-03T09:00:00Z',
      reviewers: ['drh. Nadia', 'Ustaz Rahman'],
    }, ORIGIN);

    expect(schema).toMatchObject({
      '@type': 'Article',
      '@id': `${ORIGIN}/konten/amanah-dokter-hewan#article`,
      mainEntityOfPage: `${ORIGIN}/konten/amanah-dokter-hewan`,
      articleSection: 'Islam Veteriner',
      publisher: { '@id': `${ORIGIN}/#organization` },
    });
    expect(schema.editor).toEqual([
      { '@type': 'Person', name: 'drh. Nadia' },
      { '@type': 'Person', name: 'Ustaz Rahman' },
    ]);
  });

  it('publishes Event and Breadcrumb structured data with local event time', () => {
    const event = createEventStructuredData({
      path: '/agenda/kajian-profesi',
      title: 'Kajian Profesi',
      description: 'Kajian untuk mahasiswa FKH.',
      eventDate: '2026-08-10',
      startTime: '09:00',
      endTime: '11:00',
      location: 'FKH USK',
      status: 'upcoming',
      speaker: 'Ustaz Rahman',
    }, ORIGIN);
    expect(event).toMatchObject({
      '@type': 'Event',
      startDate: '2026-08-10T09:00:00+07:00',
      endDate: '2026-08-10T11:00:00+07:00',
      eventStatus: 'https://schema.org/EventScheduled',
      organizer: { '@id': `${ORIGIN}/#organization` },
    });

    const breadcrumb = createBreadcrumbStructuredData([
      { name: 'Beranda', path: '/' },
      { name: 'Agenda', path: '/agenda' },
    ], ORIGIN);
    expect(breadcrumb.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Agenda', item: `${ORIGIN}/agenda` },
    ]);
  });

  it('publishes route-level WebPage data for client-side navigation', () => {
    expect(createWebPageStructuredData({
      path: '/profil',
      title: 'Profil & Struktur',
      description: 'Mengenal LDF An-Nahl.',
      type: 'AboutPage',
    }, ORIGIN)).toMatchObject({
      '@type': 'AboutPage',
      '@id': `${ORIGIN}/profil#webpage`,
      url: `${ORIGIN}/profil`,
      isPartOf: { '@id': `${ORIGIN}/#website` },
    });
  });

  it('keeps the production build wired to prerender, sitemap, and robots generation', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const generator = readFileSync(new URL('../../scripts/buildDiscovery.mjs', import.meta.url), 'utf8');
    const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

    expect(packageJson.scripts.build).toContain('node scripts/buildDiscovery.mjs');
    expect(generator).toContain('surahs.length !== 114');
    expect(generator).toContain('`/quran/juz/${number}`');
    expect(generator).toContain("'sitemap.xml'");
    expect(generator).toContain("'robots.txt'");
    expect(generator).toContain('async function dynamicRoutes');
    expect(generator).toContain('loadEnv');
    expect(generator).toContain("'scientific_reviewer_name'");
    expect(indexHtml).toContain('name="robots"');
    expect(indexHtml).toContain('data-seo-json-ld');
    expect(indexHtml).toContain('property="og:url"');
  });
});

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(WEB_ROOT, 'dist');
const BASE_HTML_PATH = path.join(DIST_DIR, 'index.html');
const BUILD_ENV = { ...loadEnv(process.env.NODE_ENV || 'production', WEB_ROOT, ''), ...process.env };
const DEFAULT_DESCRIPTION =
  "Rumah digital LDF An-Nahl FKH USK: agenda, Al-Qur'an, waktu shalat, tulisan, dan informasi organisasi.";
const DEFAULT_IMAGE_PATH = '/assets/og-card.jpg';

function resolveSiteUrl() {
  const configured = (
    BUILD_ENV.VITE_SITE_URL ||
    BUILD_ENV.SITE_URL ||
    BUILD_ENV.CF_PAGES_URL ||
    'http://127.0.0.1:5174'
  ).trim();
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_SITE_URL/SITE_URL must use http or https.');
  }
  if (!BUILD_ENV.VITE_SITE_URL && !BUILD_ENV.SITE_URL && !BUILD_ENV.CF_PAGES_URL) {
    console.warn('[discovery] VITE_SITE_URL belum diatur; artifact lokal memakai http://127.0.0.1:5174.');
  }
  return url.origin;
}

const SITE_URL = resolveSiteUrl();

function absoluteUrl(pathname) {
  return new URL(pathname, `${SITE_URL}/`).href;
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upsertMeta(html, attribute, key, content) {
  const expression = new RegExp(`<meta(?=[^>]*${attribute}=["']${regexEscape(key)}["'])[^>]*>`, 'i');
  const tag = `<meta ${attribute}="${htmlEscape(key)}" content="${htmlEscape(content)}" />`;
  return expression.test(html) ? html.replace(expression, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function upsertCanonical(html, href) {
  const expression = /<link(?=[^>]*rel=["']canonical["'])[^>]*>/i;
  const tag = `<link rel="canonical" href="${htmlEscape(href)}" />`;
  return expression.test(html) ? html.replace(expression, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function replaceStructuredData(html, entries) {
  const cleaned = html.replace(/\s*<script[^>]*data-seo-json-ld[^>]*>[\s\S]*?<\/script>/gi, '');
  const scripts = entries
    .map((entry) => {
      const json = JSON.stringify(entry).replace(/</g, '\\u003c');
      return `    <script type="application/ld+json" data-seo-json-ld>${json}</script>`;
    })
    .join('\n');
  return cleaned.replace('</head>', `${scripts ? `${scripts}\n` : ''}  </head>`);
}

function organizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: 'LDF An-Nahl FKH USK',
    alternateName: 'Lembaga Dakwah Fakultas An-Nahl',
    url: absoluteUrl('/'),
    logo: absoluteUrl('/assets/logo-192.jpg'),
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'Universitas Syiah Kuala',
    },
  };
}

function breadcrumbStructuredData(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function defaultStructuredData(route) {
  if (route.path === '/') {
    return [
      organizationStructuredData(),
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        url: absoluteUrl('/'),
        name: 'LDF An-Nahl — FKH USK',
        description: DEFAULT_DESCRIPTION,
        inLanguage: 'id-ID',
        publisher: { '@id': absoluteUrl('/#organization') },
      },
    ];
  }
  return [
    {
      '@context': 'https://schema.org',
      '@type': route.schemaType || 'WebPage',
      '@id': absoluteUrl(`${route.path}#webpage`),
      url: absoluteUrl(route.path),
      name: route.fullTitle,
      description: route.description,
      inLanguage: route.languages || 'id-ID',
      isPartOf: { '@id': absoluteUrl('/#website') },
    },
    breadcrumbStructuredData(route.breadcrumbs || [
      { name: 'Beranda', path: '/' },
      { name: route.title || 'Halaman', path: route.path },
    ]),
  ];
}

function fallbackMarkup(route) {
  const links = route.path === '/'
    ? '<nav aria-label="Jelajah"><a href="/agenda">Agenda</a> · <a href="/quran">Al-Qur\'an</a> · <a href="/konten">Tulisan</a> · <a href="/profil">Profil</a></nav>'
    : '<p><a href="/">Kembali ke Beranda LDF An-Nahl</a></p>';
  return `<div id="root"><main data-prerendered="true" style="max-width:760px;margin:0 auto;padding:64px 20px;font-family:system-ui,sans-serif"><p style="letter-spacing:.18em;text-transform:uppercase">LDF An-Nahl · FKH USK</p><h1>${htmlEscape(route.heading || route.title || 'LDF An-Nahl')}</h1><p>${htmlEscape(route.description)}</p>${links}</main></div>`;
}

function renderRouteHtml(baseHtml, route) {
  const fullTitle = route.title ? `${route.title} · LDF An-Nahl` : 'LDF An-Nahl — FKH USK';
  const canonical = absoluteUrl(route.path);
  const image = absoluteUrl(route.image || DEFAULT_IMAGE_PATH);
  const robots = route.noIndex
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  let html = baseHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(fullTitle)}</title>`);
  html = upsertMeta(html, 'name', 'description', route.description);
  html = upsertMeta(html, 'name', 'robots', robots);
  html = upsertCanonical(html, canonical);
  html = upsertMeta(html, 'property', 'og:type', route.ogType || 'website');
  html = upsertMeta(html, 'property', 'og:title', fullTitle);
  html = upsertMeta(html, 'property', 'og:description', route.description);
  html = upsertMeta(html, 'property', 'og:url', canonical);
  html = upsertMeta(html, 'property', 'og:image', image);
  html = upsertMeta(html, 'name', 'twitter:title', fullTitle);
  html = upsertMeta(html, 'name', 'twitter:description', route.description);
  html = upsertMeta(html, 'name', 'twitter:image', image);
  if (route.publishedAt) html = upsertMeta(html, 'property', 'article:published_time', route.publishedAt);
  if (route.updatedAt) html = upsertMeta(html, 'property', 'article:modified_time', route.updatedAt);
  html = replaceStructuredData(html, route.structuredData || defaultStructuredData({ ...route, fullTitle }));
  html = html.replace('<div id="root"></div>', fallbackMarkup(route));
  return html;
}

function parseQuotedValue(line, key) {
  const match = line.match(new RegExp(`${key}:\\s*("[^"]*"|'[^']*')`));
  if (!match) return null;
  const token = match[1];
  return token.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
}

async function readSurahRoutes() {
  const source = await readFile(path.join(WEB_ROOT, 'src/data/surahs.ts'), 'utf8');
  const surahs = source
    .split(/\r?\n/)
    .map((line) => {
      const number = Number(line.match(/\{\s*no:\s*(\d+)/)?.[1]);
      const name = parseQuotedValue(line, 'name');
      const meaning = parseQuotedValue(line, 'arti');
      const verses = Number(line.match(/ayat:\s*(\d+)/)?.[1]);
      return number && name && meaning && verses ? { number, name, meaning, verses } : null;
    })
    .filter(Boolean);
  if (surahs.length !== 114) {
    throw new Error(`Discovery build expected 114 surahs, found ${surahs.length}.`);
  }
  return surahs.map((surah) => {
    const title = `Surah ${surah.name}`;
    return {
      path: `/quran/${surah.number}`,
      title,
      heading: title,
      description: `Baca Surah ${surah.name} (${surah.meaning}), ${surah.verses} ayat, dengan teks Arab, transliterasi, terjemahan, tajwid, dan audio.`,
      languages: ['ar', 'id-ID'],
      priority: '0.7',
      changefreq: 'monthly',
      breadcrumbs: [
        { name: 'Beranda', path: '/' },
        { name: "Al-Qur'an", path: '/quran' },
        { name: title, path: `/quran/${surah.number}` },
      ],
    };
  });
}

function baseRoutes() {
  return [
    {
      path: '/',
      title: null,
      heading: 'Rumah Digital LDF An-Nahl',
      description: DEFAULT_DESCRIPTION,
      priority: '1.0',
      changefreq: 'weekly',
    },
    {
      path: '/agenda',
      title: 'Agenda',
      description: 'Jadwal kajian, mentoring, kegiatan sosial, dan agenda LDF An-Nahl FKH USK.',
      schemaType: 'CollectionPage',
      priority: '0.8',
      changefreq: 'daily',
    },
    {
      path: '/profil',
      title: 'Profil & Struktur',
      description: 'Mengenal sejarah, arah dakwah, dan struktur organisasi LDF An-Nahl FKH USK.',
      schemaType: 'AboutPage',
      priority: '0.7',
      changefreq: 'monthly',
    },
    {
      path: '/shalat',
      title: 'Waktu Shalat',
      description: 'Jadwal shalat harian berdasarkan kota pilihan, lengkap dengan waktu pembaruan dan sumber data.',
      priority: '0.7',
      changefreq: 'daily',
    },
    {
      path: '/quran',
      title: "Al-Qur'an",
      description: "Baca Al-Qur'an per surah dan juz dengan teks Arab, transliterasi, terjemahan, tajwid, dan audio.",
      schemaType: 'CollectionPage',
      priority: '0.9',
      changefreq: 'monthly',
    },
    {
      path: '/konten',
      title: 'Tulisan',
      description: 'Islam Veteriner, kisah, dan renungan yang menghubungkan iman, ilmu, dan amanah profesi.',
      schemaType: 'CollectionPage',
      priority: '0.8',
      changefreq: 'weekly',
    },
  ];
}

function juzRoutes() {
  return Array.from({ length: 30 }, (_, index) => {
    const number = index + 1;
    const title = `Juz ${number}`;
    return {
      path: `/quran/juz/${number}`,
      title,
      description: `Baca Al-Qur'an Juz ${number} dengan teks Arab, transliterasi, terjemahan, tajwid, dan audio.`,
      languages: ['ar', 'id-ID'],
      priority: '0.6',
      changefreq: 'monthly',
      breadcrumbs: [
        { name: 'Beranda', path: '/' },
        { name: "Al-Qur'an", path: '/quran' },
        { name: title, path: `/quran/juz/${number}` },
      ],
    };
  });
}

async function fetchPublicRows(table, query) {
  const supabaseUrl = BUILD_ENV.VITE_SUPABASE_URL?.trim();
  const anonKey = BUILD_ENV.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return [];
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`${table} returned HTTP ${response.status}`);
  return response.json();
}

async function dynamicRoutes() {
  if (!BUILD_ENV.VITE_SUPABASE_URL || !BUILD_ENV.VITE_SUPABASE_ANON_KEY) {
    console.warn('[discovery] Supabase build env tidak tersedia; prerender dinamis artikel/agenda dilewati.');
    return [];
  }
  try {
    const fetchArticles = async () => {
      const editorialSelect = [
        'slug',
        'title',
        'excerpt',
        'dek',
        'category',
        'topics',
        'cover_image_url',
        'author_name',
        'scientific_reviewer_name',
        'sharia_reviewer_name',
        'published_at',
        'updated_at',
      ].join(',');
      try {
        return await fetchPublicRows('articles', {
          select: editorialSelect,
          status: 'eq.published',
          order: 'published_at.desc',
        });
      } catch {
        // Keep discovery builds working while the Phase 1 editorial migration
        // is still being rolled out to an older Supabase project.
        return fetchPublicRows('articles', {
          select: 'slug,title,excerpt,cover_image_url,published_at,updated_at',
          status: 'eq.published',
          order: 'published_at.desc',
        });
      }
    };
    const [articles, agendas] = await Promise.all([
      fetchArticles(),
      fetchPublicRows('agendas', {
        select: 'id,title,type,event_date,start_time,end_time,location,pemateri,description,created_at',
        order: 'event_date.desc',
      }),
    ]);
    const articleRoutes = articles
      .filter((row) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug))
      .map((row) => {
        const routePath = `/konten/${row.slug}`;
        return {
          path: routePath,
          title: row.title,
           description: row.dek || row.excerpt,
          image: row.cover_image_url,
          ogType: 'article',
          publishedAt: row.published_at,
          updatedAt: row.updated_at,
          lastmod: row.updated_at || row.published_at,
          priority: '0.7',
          changefreq: 'monthly',
          structuredData: [
            organizationStructuredData(),
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              '@id': absoluteUrl(`${routePath}#article`),
              mainEntityOfPage: absoluteUrl(routePath),
              headline: row.title,
               description: row.dek || row.excerpt,
               image: absoluteUrl(row.cover_image_url || DEFAULT_IMAGE_PATH),
               datePublished: row.published_at || undefined,
               dateModified: row.updated_at || row.published_at || undefined,
               articleSection: row.category || undefined,
               keywords: Array.isArray(row.topics) && row.topics.length > 0
                 ? row.topics.join(', ')
                 : undefined,
               inLanguage: 'id-ID',
               isAccessibleForFree: true,
               author: { '@type': 'Person', name: row.author_name || 'Tim Media An-Nahl' },
               editor: [row.scientific_reviewer_name, row.sharia_reviewer_name]
                 .filter(Boolean)
                 .map((name) => ({ '@type': 'Person', name })),
               publisher: { '@id': absoluteUrl('/#organization') },
            },
            breadcrumbStructuredData([
              { name: 'Beranda', path: '/' },
              { name: 'Tulisan', path: '/konten' },
              { name: row.title, path: routePath },
            ]),
          ],
        };
      });
    const agendaRoutes = agendas
      .filter((row) => /^[0-9a-f-]{20,}$/i.test(row.id))
      .filter((row) => !(
        row.event_date === '2026-07-10' &&
        (row.title === 'Ibnu Ganteng' || row.title === 'Review')
      ))
      .map((row) => {
        const routePath = `/agenda/${row.id}`;
        const startDate = `${row.event_date}T${String(row.start_time).slice(0, 5)}:00+07:00`;
        const endDate = `${row.event_date}T${String(row.end_time).slice(0, 5)}:00+07:00`;
        return {
          path: routePath,
          title: row.title,
          description: row.description,
          lastmod: row.created_at,
          priority: '0.6',
          changefreq: 'monthly',
          structuredData: [
            organizationStructuredData(),
            {
              '@context': 'https://schema.org',
              '@type': 'Event',
              '@id': absoluteUrl(`${routePath}#event`),
              name: row.title,
              description: row.description,
              url: absoluteUrl(routePath),
              startDate,
              endDate,
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              eventStatus: 'https://schema.org/EventScheduled',
              location: {
                '@type': 'Place',
                name: row.location,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Banda Aceh',
                  addressRegion: 'Aceh',
                  addressCountry: 'ID',
                },
              },
              performer: row.pemateri ? { '@type': 'Person', name: row.pemateri } : undefined,
              organizer: { '@id': absoluteUrl('/#organization') },
            },
            breadcrumbStructuredData([
              { name: 'Beranda', path: '/' },
              { name: 'Agenda', path: '/agenda' },
              { name: row.title, path: routePath },
            ]),
          ],
        };
      });
    return [...articleRoutes, ...agendaRoutes];
  } catch (error) {
    console.warn(`[discovery] Prerender dinamis dilewati: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function outputPathForRoute(routePath) {
  if (routePath === '/') return BASE_HTML_PATH;
  const segments = routePath.split('/').filter(Boolean);
  return path.join(DIST_DIR, ...segments, 'index.html');
}

async function writeRoute(baseHtml, route) {
  const outputPath = outputPathForRoute(route.path);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderRouteHtml(baseHtml, route), 'utf8');
}

function sitemapXml(routes) {
  const urls = routes.map((route) => {
    const lastmod = route.lastmod ? `\n    <lastmod>${xmlEscape(String(route.lastmod).slice(0, 10))}</lastmod>` : '';
    return `  <url>\n    <loc>${xmlEscape(absoluteUrl(route.path))}</loc>${lastmod}\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /scan\nDisallow: /login\nDisallow: /register\nDisallow: /lupa-password\nDisallow: /reset-password\nDisallow: /menunggu-persetujuan\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
}

async function main() {
  const baseHtml = await readFile(BASE_HTML_PATH, 'utf8');
  const dynamic = await dynamicRoutes();
  const routes = [
    ...baseRoutes(),
    ...(await readSurahRoutes()),
    ...juzRoutes(),
    ...dynamic,
  ];
  const uniqueRoutes = [...new Map(routes.map((route) => [route.path, route])).values()];
  await Promise.all(uniqueRoutes.map((route) => writeRoute(baseHtml, route)));
  await writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml(uniqueRoutes), 'utf8');
  await writeFile(path.join(DIST_DIR, 'robots.txt'), robotsTxt(), 'utf8');
  await writeFile(
    path.join(DIST_DIR, 'prerender-manifest.json'),
    `${JSON.stringify({
      siteUrl: SITE_URL,
      routeCount: uniqueRoutes.length,
      dynamicRouteCount: dynamic.length,
      routes: uniqueRoutes.map((route) => route.path),
    }, null, 2)}\n`,
    'utf8',
  );

  if (uniqueRoutes.length < 150) throw new Error(`Discovery build produced only ${uniqueRoutes.length} routes.`);
  const sitemap = await readFile(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
  if (!sitemap.includes('<loc>http') || !sitemap.includes('/quran/114</loc>')) {
    throw new Error('Generated sitemap failed its integrity check.');
  }
  console.log(
    `[discovery] ${uniqueRoutes.length} halaman diprerender (${dynamic.length} detail dinamis); sitemap dan robots.txt siap untuk ${SITE_URL}.`,
  );
}

await main();

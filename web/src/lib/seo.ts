const SITE_NAME = 'LDF An-Nahl';
const SITE_TITLE = `${SITE_NAME} — FKH USK`;
const DEFAULT_DESCRIPTION =
  'Rumah digital LDF An-Nahl FKH USK: agenda, Al-Qur\'an, waktu shalat, tulisan, dan informasi organisasi.';
const DEFAULT_SOCIAL_IMAGE = '/assets/og-card.jpg';

export type SeoPageType = 'website' | 'article' | 'profile';
export type StructuredData = Record<string, unknown>;

export interface PageSeo {
  title?: string | null;
  description?: string;
  path?: string;
  image?: string | null;
  type?: SeoPageType;
  noIndex?: boolean;
  noFollow?: boolean;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  structuredData?: StructuredData | StructuredData[];
}

export interface RouteSeo extends Required<Pick<PageSeo, 'description' | 'path' | 'type'>> {
  title: string | null;
  noIndex: boolean;
  noFollow: boolean;
}

const PUBLIC_ROUTES: Array<{
  pattern: RegExp;
  title: string | null;
  description: string;
  type?: SeoPageType;
}> = [
  {
    pattern: /^\/$/,
    title: null,
    description: DEFAULT_DESCRIPTION,
  },
  {
    pattern: /^\/agenda\/?$/,
    title: 'Agenda',
    description: 'Jadwal kajian, mentoring, kegiatan sosial, dan agenda LDF An-Nahl FKH USK.',
  },
  {
    pattern: /^\/profil\/?$/,
    title: 'Profil & Struktur',
    description: 'Mengenal sejarah, arah dakwah, dan struktur organisasi LDF An-Nahl FKH USK.',
    type: 'profile',
  },
  {
    pattern: /^\/shalat\/?$/,
    title: 'Waktu Shalat',
    description: 'Jadwal shalat harian berdasarkan kota pilihan, lengkap dengan waktu pembaruan dan sumber data.',
  },
  {
    pattern: /^\/quran\/?$/,
    title: "Al-Qur'an",
    description: "Baca Al-Qur'an per surah dan juz dengan teks Arab, transliterasi, terjemahan, tajwid, dan audio.",
  },
  {
    pattern: /^\/konten\/?$/,
    title: 'Tulisan',
    description: 'Islam Veteriner, kisah, dan renungan yang menghubungkan iman, ilmu, dan amanah profesi.',
  },
];

const PRIVATE_OR_UTILITY_PATH = /^(?:\/admin(?:\/|$)|\/dashboard\/?$|\/scan\/|\/login\/?$|\/register\/?$|\/lupa-password\/?$|\/reset-password\/?$|\/menunggu-persetujuan\/?$)/;

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

export function getRouteSeo(pathname: string): RouteSeo {
  const path = normalizePath(pathname);
  const staticRoute = PUBLIC_ROUTES.find((route) => route.pattern.test(path));
  if (staticRoute) {
    return {
      title: staticRoute.title,
      description: staticRoute.description,
      path,
      type: staticRoute.type ?? 'website',
      noIndex: false,
      noFollow: false,
    };
  }

  const juzMatch = path.match(/^\/quran\/juz\/(\d+)$/);
  if (juzMatch) {
    return {
      title: `Juz ${juzMatch[1]}`,
      description: `Baca Al-Qur'an Juz ${juzMatch[1]} dengan teks Arab, transliterasi, terjemahan, tajwid, dan audio.`,
      path,
      type: 'website',
      noIndex: false,
      noFollow: false,
    };
  }

  const surahMatch = path.match(/^\/quran\/(\d+)$/);
  if (surahMatch) {
    return {
      title: `Surah ${surahMatch[1]}`,
      description: `Baca Surah nomor ${surahMatch[1]} dengan teks Arab, transliterasi, terjemahan, tajwid, dan audio.`,
      path,
      type: 'website',
      noIndex: false,
      noFollow: false,
    };
  }

  if (/^\/(?:agenda|konten)\//.test(path)) {
    return {
      title: path.startsWith('/agenda/') ? 'Detail Agenda' : 'Tulisan',
      description: path.startsWith('/agenda/')
        ? 'Detail agenda LDF An-Nahl FKH USK.'
        : 'Tulisan pilihan LDF An-Nahl FKH USK.',
      path,
      type: path.startsWith('/konten/') ? 'article' : 'website',
      noIndex: true,
      noFollow: false,
    };
  }

  if (PRIVATE_OR_UTILITY_PATH.test(path)) {
    return {
      title: 'Area Internal',
      description: 'Area internal anggota dan pengurus LDF An-Nahl.',
      path,
      type: 'website',
      noIndex: true,
      noFollow: true,
    };
  }

  return {
    title: 'Halaman Tidak Ditemukan',
    description: 'Halaman yang diminta tidak ditemukan.',
    path,
    type: 'website',
    noIndex: true,
    noFollow: false,
  };
}

function configuredSiteOrigin(): string | null {
  const configured = import.meta.env.VITE_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

export function getSiteOrigin(): string {
  return configuredSiteOrigin() ?? window.location.origin;
}

export function absoluteSiteUrl(pathOrUrl: string, origin = getSiteOrigin()): string {
  try {
    return new URL(pathOrUrl, `${origin.replace(/\/+$/, '')}/`).href;
  } catch {
    return pathOrUrl;
  }
}

function documentTitle(section?: string | null): string {
  return section ? `${section} · ${SITE_NAME}` : SITE_TITLE;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeMeta(attribute: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attribute}="${key}"]`)?.remove();
}

function setCanonical(href: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = href;
}

function setStructuredData(value?: StructuredData | StructuredData[]) {
  document.head.querySelectorAll('script[data-seo-json-ld]').forEach((node) => node.remove());
  if (!value) return;
  const entries = Array.isArray(value) ? value : [value];
  entries.forEach((entry) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoJsonLd = '';
    script.textContent = JSON.stringify(entry).replace(/</g, '\\u003c');
    document.head.appendChild(script);
  });
}

function applySeo(input: PageSeo) {
  const route = getRouteSeo(input.path ?? window.location.pathname);
  const title = input.title === undefined ? route.title : input.title;
  const description = input.description ?? route.description;
  const path = normalizePath(input.path ?? route.path);
  const canonical = absoluteSiteUrl(path);
  const image = absoluteSiteUrl(input.image || DEFAULT_SOCIAL_IMAGE);
  const type = input.type ?? route.type;
  const noIndex = input.noIndex ?? route.noIndex;
  const noFollow = input.noFollow ?? route.noFollow;
  const robots = noIndex
    ? `noindex, ${noFollow ? 'nofollow' : 'follow'}`
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const fullTitle = documentTitle(title);

  document.title = fullTitle;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  setCanonical(canonical);

  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:title', fullTitle);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:locale', 'id_ID');

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', fullTitle);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);

  if (input.publishedTime) upsertMeta('property', 'article:published_time', input.publishedTime);
  else removeMeta('property', 'article:published_time');
  if (input.modifiedTime) upsertMeta('property', 'article:modified_time', input.modifiedTime);
  else removeMeta('property', 'article:modified_time');

  setStructuredData(input.structuredData);
}

/** Path most recently claimed by a detail page. Child effects run before the
 * Layout effect, so this prevents a generic route fallback from replacing
 * metadata that was resolved from article/agenda/Qur'an data in the same render. */
let ownedPath: string | null = null;

export function setPageSeo(input: PageSeo) {
  ownedPath = normalizePath(input.path ?? window.location.pathname);
  applySeo({ ...input, path: ownedPath });
}

export function setRouteSeo(pathname: string) {
  const path = normalizePath(pathname);
  if (ownedPath === path) return;
  ownedPath = null;
  const route = getRouteSeo(path);
  const origin = getSiteOrigin();
  const structuredData = path === '/'
    ? [createOrganizationStructuredData(origin), createWebSiteStructuredData(origin)]
    : route.noIndex
      ? undefined
      : [
          createWebPageStructuredData({
            path,
            title: route.title || SITE_NAME,
            description: route.description,
            type: routeSchemaType(path),
          }, origin),
          createBreadcrumbStructuredData([
            { name: 'Beranda', path: '/' },
            { name: route.title || SITE_NAME, path },
          ], origin),
        ];
  applySeo({ ...route, structuredData });
}

/** Backward-compatible title helpers for pages that do not yet need richer
 * detail metadata. */
export function setPageTitle(section?: string | null) {
  setPageSeo({ title: section });
}

export function setRouteTitle(pathname: string) {
  setRouteSeo(pathname);
}

export function createOrganizationStructuredData(origin = getSiteOrigin()): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteSiteUrl('/#organization', origin),
    name: 'LDF An-Nahl FKH USK',
    alternateName: 'Lembaga Dakwah Fakultas An-Nahl',
    url: absoluteSiteUrl('/', origin),
    logo: absoluteSiteUrl('/assets/logo-192.jpg', origin),
    description: DEFAULT_DESCRIPTION,
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'Universitas Syiah Kuala',
    },
  };
}

export function createWebSiteStructuredData(origin = getSiteOrigin()): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteSiteUrl('/#website', origin),
    url: absoluteSiteUrl('/', origin),
    name: SITE_TITLE,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'id-ID',
    publisher: { '@id': absoluteSiteUrl('/#organization', origin) },
  };
}

export interface WebPageStructuredDataInput {
  path: string;
  title: string;
  description: string;
  type?: 'WebPage' | 'CollectionPage' | 'AboutPage';
}

function routeSchemaType(pathname: string): WebPageStructuredDataInput['type'] {
  if (pathname === '/profil') return 'AboutPage';
  if (pathname === '/agenda' || pathname === '/quran' || pathname === '/konten') return 'CollectionPage';
  return 'WebPage';
}

export function createWebPageStructuredData(
  page: WebPageStructuredDataInput,
  origin = getSiteOrigin(),
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': page.type || 'WebPage',
    '@id': absoluteSiteUrl(`${page.path}#webpage`, origin),
    url: absoluteSiteUrl(page.path, origin),
    name: page.title,
    description: page.description,
    inLanguage: 'id-ID',
    isPartOf: { '@id': absoluteSiteUrl('/#website', origin) },
  };
}

export function createBreadcrumbStructuredData(
  items: Array<{ name: string; path: string }>,
  origin = getSiteOrigin(),
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteSiteUrl(item.path, origin),
    })),
  };
}

export interface ArticleStructuredDataInput {
  path: string;
  title: string;
  description: string;
  image?: string | null;
  authorName: string;
  category: string;
  topics: string[];
  publishedAt?: string | null;
  updatedAt?: string | null;
  reviewers?: string[];
}

export function createArticleStructuredData(
  article: ArticleStructuredDataInput,
  origin = getSiteOrigin(),
): StructuredData {
  const editors = (article.reviewers ?? []).filter(Boolean).map((name) => ({ '@type': 'Person', name }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': absoluteSiteUrl(`${article.path}#article`, origin),
    mainEntityOfPage: absoluteSiteUrl(article.path, origin),
    headline: article.title,
    description: article.description,
    image: absoluteSiteUrl(article.image || DEFAULT_SOCIAL_IMAGE, origin),
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || article.publishedAt || undefined,
    articleSection: article.category,
    keywords: article.topics.length > 0 ? article.topics.join(', ') : undefined,
    inLanguage: 'id-ID',
    isAccessibleForFree: true,
    author: { '@type': 'Person', name: article.authorName },
    editor: editors.length > 0 ? editors : undefined,
    publisher: { '@id': absoluteSiteUrl('/#organization', origin) },
  };
}

export interface EventStructuredDataInput {
  path: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  status: 'past' | 'today' | 'upcoming';
  speaker?: string | null;
}

export function createEventStructuredData(
  event: EventStructuredDataInput,
  origin = getSiteOrigin(),
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': absoluteSiteUrl(`${event.path}#event`, origin),
    name: event.title,
    description: event.description,
    url: absoluteSiteUrl(event.path, origin),
    startDate: `${event.eventDate}T${event.startTime}:00+07:00`,
    endDate: `${event.eventDate}T${event.endTime}:00+07:00`,
    eventStatus: event.status === 'past'
      ? 'https://schema.org/EventCompleted'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Banda Aceh',
        addressRegion: 'Aceh',
        addressCountry: 'ID',
      },
    },
    performer: event.speaker ? { '@type': 'Person', name: event.speaker } : undefined,
    organizer: { '@id': absoluteSiteUrl('/#organization', origin) },
  };
}

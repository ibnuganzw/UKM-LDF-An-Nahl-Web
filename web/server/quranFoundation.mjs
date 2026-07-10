import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(SERVER_DIR, '..');
const SURAH_SOURCE_PATH = path.join(WEB_ROOT, 'src', 'data', 'surahs.ts');
const CACHE_DIR = process.env.QF_CACHE_DIR
  ? path.resolve(WEB_ROOT, process.env.QF_CACHE_DIR)
  : path.join(WEB_ROOT, '.cache', 'quran-foundation');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const PER_PAGE = 50;
const QURAN_FIELDS = 'text_uthmani,text_indopak,text_uthmani_tajweed,text_qpc_hafs';
const QURAN_COM_API_BASE_URL = (process.env.QURAN_COM_API_BASE_URL?.trim() || 'https://api.quran.com/api/v4').replace(/\/+$/, '');
const SUPPLEMENT_API_BASE_URL = (process.env.QURAN_SUPPLEMENT_API_BASE_URL?.trim() || 'https://api.alquran.cloud/v1').replace(/\/+$/, '');
const TRANSLATION_EDITION = process.env.QURAN_TRANSLATION_EDITION?.trim() || 'id.indonesian';
const TRANSLITERATION_EDITION = process.env.QURAN_TRANSLITERATION_EDITION?.trim() || 'en.transliteration';
const QURAN_ENV_URLS = {
  prelive: {
    authBaseUrl: 'https://prelive-oauth2.quran.foundation',
    apiBaseUrl: 'https://apis-prelive.quran.foundation',
  },
  production: {
    authBaseUrl: 'https://oauth2.quran.foundation',
    apiBaseUrl: 'https://apis.quran.foundation',
  },
};

let metadataCache;
let tokenCache;

export class QuranFoundationError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'QuranFoundationError';
    this.status = status;
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function optionalPositiveInteger(value) {
  const number = toPositiveInteger(value);
  return number === undefined ? undefined : number;
}

export function assertChapterNumber(value) {
  const chapterNumber = Number(value);

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
    throw new QuranFoundationError('Nomor surah harus berada di antara 1 dan 114.', 400);
  }

  return chapterNumber;
}

function getCacheMaxAgeMs() {
  const requestedAge = Number(process.env.QF_CACHE_MAX_AGE_MS);

  if (Number.isFinite(requestedAge) && requestedAge > 0) {
    return Math.min(requestedAge, SEVEN_DAYS_MS);
  }

  return SEVEN_DAYS_MS;
}

function getCacheFilePath(chapterNumber) {
  return path.join(CACHE_DIR, `chapter-${String(chapterNumber).padStart(3, '0')}.json`);
}

function getSupplementTimeoutMs() {
  const requestedTimeout = Number(process.env.QURAN_SUPPLEMENT_TIMEOUT_MS);

  if (Number.isFinite(requestedTimeout) && requestedTimeout > 0) {
    return Math.min(Math.round(requestedTimeout), 15_000);
  }

  return 4_500;
}

function getSupplementCacheMaxAgeMs() {
  const requestedAge = Number(process.env.QURAN_SUPPLEMENT_CACHE_MAX_AGE_MS);

  if (Number.isFinite(requestedAge) && requestedAge > 0) {
    return Math.min(requestedAge, THIRTY_DAYS_MS);
  }

  return THIRTY_DAYS_MS;
}

function getSafeCachePart(value) {
  return String(value).replace(/[^a-z0-9_.-]+/gi, '_');
}

function getSupplementCacheFilePath(kind, edition, chapterNumber) {
  const chapter = String(chapterNumber).padStart(3, '0');
  return path.join(CACHE_DIR, `${getSafeCachePart(kind)}-${getSafeCachePart(edition)}-${chapter}.json`);
}

function getQuranComCodeV2CacheFilePath(chapterNumber) {
  return path.join(CACHE_DIR, `qurancom-code-v2-${String(chapterNumber).padStart(3, '0')}.json`);
}

async function readErrorText(response) {
  try {
    return (await response.text()).slice(0, 280);
  } catch {
    return '';
  }
}

async function fetchWithRetry(url, init, options = {}) {
  const maxAttempts = options.maxAttempts ?? 4;
  const label = options.label ?? 'request';
  const provider = options.provider ?? 'Quran Foundation';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;

    try {
      response = await fetch(url, init);
    } catch (error) {
      if (attempt < maxAttempts) {
        await delay(400 * attempt);
        continue;
      }

      const message = error instanceof Error ? error.message : 'network error';
      throw new QuranFoundationError(`Gagal menghubungi ${provider} (${label}): ${message}`, 502);
    }

    if (response.ok) {
      return response;
    }

    const retryable = response.status === 429 || response.status >= 500;

    if (!retryable || attempt >= maxAttempts) {
      const body = await readErrorText(response);
      throw new QuranFoundationError(
        `${provider} ${label} gagal (${response.status}).${body ? ` ${body}` : ''}`,
        response.status,
      );
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 450 * attempt);
  }

  throw new QuranFoundationError(`${provider} ${label} gagal.`, 502);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new QuranFoundationError(`${name} harus tersedia di server/env.`, 503);
  }

  return value;
}

function getQuranEnvironment() {
  const requestedEnv = process.env.QF_ENV?.trim().toLowerCase();

  if (!requestedEnv || requestedEnv === 'prod' || requestedEnv === 'production') {
    return 'production';
  }

  if (requestedEnv === 'prelive' || requestedEnv === 'pre-live' || requestedEnv === 'dev' || requestedEnv === 'development') {
    return 'prelive';
  }

  throw new QuranFoundationError('QF_ENV harus production atau prelive.', 500);
}

function appendTokenPath(authBaseUrl) {
  const cleanBaseUrl = authBaseUrl.replace(/\/+$/, '');
  return cleanBaseUrl.endsWith('/oauth2/token') ? cleanBaseUrl : `${cleanBaseUrl}/oauth2/token`;
}

function getTokenUrl() {
  const explicitTokenUrl = process.env.QF_TOKEN_URL?.trim();

  if (explicitTokenUrl) {
    return explicitTokenUrl;
  }

  const explicitAuthUrl = process.env.QF_AUTH_URL?.trim();

  if (explicitAuthUrl) {
    return appendTokenPath(explicitAuthUrl);
  }

  return appendTokenPath(QURAN_ENV_URLS[getQuranEnvironment()].authBaseUrl);
}

function getContentApiBaseUrl() {
  const explicitBaseUrl = process.env.QF_CONTENT_API_BASE_URL?.trim();

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, '');
  }

  return `${QURAN_ENV_URLS[getQuranEnvironment()].apiBaseUrl}/content/api/v4`;
}

async function getAccessToken() {
  const clientId = requireEnv('QF_CLIENT_ID');
  const clientSecret = requireEnv('QF_CLIENT_SECRET');
  const providedToken = process.env.QF_ACCESS_TOKEN?.trim();
  const tokenUrl = getTokenUrl();

  if (providedToken) {
    return { clientId, token: providedToken };
  }

  if (tokenCache && tokenCache.clientId === clientId && tokenCache.tokenUrl === tokenUrl && Date.now() < tokenCache.expiresAt) {
    return { clientId, token: tokenCache.token };
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'content',
  });

  const response = await fetchWithRetry(
    tokenUrl,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
    { label: 'token' },
  );
  const payload = await response.json();
  const token = payload.access_token ?? payload.token ?? payload.auth_token;

  if (typeof token !== 'string' || token.length === 0) {
    throw new QuranFoundationError('Response token Quran Foundation tidak valid.', 502);
  }

  const expiresInSeconds = Number(payload.expires_in);
  const ttl = Number.isFinite(expiresInSeconds) && expiresInSeconds > 60 ? (expiresInSeconds - 60) * 1000 : 45 * 60 * 1000;
  tokenCache = {
    clientId,
    tokenUrl,
    token,
    expiresAt: Date.now() + ttl,
  };

  return { clientId, token };
}

function getPropertyName(ts, nameNode) {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }

  return undefined;
}

function readNumericProperty(ts, objectNode, propertyName) {
  for (const property of objectNode.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    if (getPropertyName(ts, property.name) !== propertyName) {
      continue;
    }

    if (ts.isNumericLiteral(property.initializer)) {
      return Number(property.initializer.text);
    }
  }

  return undefined;
}

function readStringProperty(ts, objectNode, propertyName) {
  for (const property of objectNode.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    if (getPropertyName(ts, property.name) !== propertyName) {
      continue;
    }

    if (ts.isStringLiteral(property.initializer) || ts.isNoSubstitutionTemplateLiteral(property.initializer)) {
      return property.initializer.text;
    }
  }

  return undefined;
}

let metadataCachePromise;

export async function loadSurahMetadata() {
  if (metadataCache) {
    return metadataCache;
  }

  if (!metadataCachePromise) {
    metadataCachePromise = (async () => {
      const ts = await import('typescript');
      const sourceText = await fs.readFile(SURAH_SOURCE_PATH, 'utf8');
  const sourceFile = ts.createSourceFile(SURAH_SOURCE_PATH, sourceText, ts.ScriptTarget.Latest, true);
  let surahsArray;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === 'SURAHS_RAW'
      && node.initializer
      && ts.isArrayLiteralExpression(node.initializer)
    ) {
      surahsArray = node.initializer;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!surahsArray) {
    throw new QuranFoundationError('Metadata surah aplikasi tidak ditemukan.', 500);
  }

  const metadata = [];

  for (const element of surahsArray.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      continue;
    }

    const no = readNumericProperty(ts, element, 'no');
    const ayat = readNumericProperty(ts, element, 'ayat');
    const name = readStringProperty(ts, element, 'name');
    const arti = readStringProperty(ts, element, 'arti');

    if (Number.isInteger(no) && Number.isInteger(ayat)) {
      metadata.push({ no, ayat, name: name ?? `Surah ${no}`, arti: arti ?? '' });
    }
  }

  if (metadata.length !== 114) {
      throw new QuranFoundationError(`Metadata surah harus berisi 114 surat, ditemukan ${metadata.length}.`, 500);
    }

    metadataCache = metadata.sort((a, b) => a.no - b.no);
    return metadataCache;
  })();
  }
  return metadataCachePromise;
}

function normalizeVerse(raw, chapterNumber) {
  const verseNumber = toPositiveInteger(raw.verse_number ?? raw.verseNumber);

  return {
    id: toPositiveInteger(raw.id) ?? verseNumber ?? 0,
    verse_key: String(raw.verse_key ?? `${chapterNumber}:${verseNumber ?? ''}`),
    chapter_id: toPositiveInteger(raw.chapter_id ?? raw.chapterId) ?? chapterNumber,
    verse_number: verseNumber ?? 0,
    juz_number: optionalPositiveInteger(raw.juz_number ?? raw.juzNumber),
    hizb_number: optionalPositiveInteger(raw.hizb_number ?? raw.hizbNumber),
    rub_el_hizb_number: optionalPositiveInteger(raw.rub_el_hizb_number ?? raw.rubElHizbNumber),
    page_number: optionalPositiveInteger(raw.page_number ?? raw.pageNumber),
    text_uthmani: String(raw.text_qpc_hafs ?? raw.text_uthmani ?? ''),
    text_indopak: String(raw.text_indopak ?? ''),
    text_uthmani_tajweed: String(raw.text_uthmani_tajweed ?? ''),
    code_v2: typeof raw.code_v2 === 'string' ? raw.code_v2 : undefined,
    v2_page: optionalPositiveInteger(raw.v2_page ?? raw.v2Page),
    transliteration: typeof raw.transliteration === 'string' ? raw.transliteration : undefined,
    translation_id: typeof raw.translation_id === 'string' ? raw.translation_id : undefined,
  };
}

export function validateChapterVerses(chapterNumber, verses, expectedAyat) {
  if (verses.length !== expectedAyat) {
    throw new QuranFoundationError(
      `Jumlah ayat surah ${chapterNumber} tidak cocok. Diharapkan ${expectedAyat}, diterima ${verses.length}.`,
      502,
    );
  }

  const seen = new Set();

  for (const verse of verses) {
    if (verse.chapter_id !== chapterNumber) {
      throw new QuranFoundationError(`chapter_id tidak cocok pada ${verse.verse_key}.`, 502);
    }

    if (!Number.isInteger(verse.verse_number) || verse.verse_number < 1 || verse.verse_number > expectedAyat) {
      throw new QuranFoundationError(`Nomor ayat tidak valid pada ${verse.verse_key}.`, 502);
    }

    if (seen.has(verse.verse_key)) {
      throw new QuranFoundationError(`verse_key duplikat: ${verse.verse_key}.`, 502);
    }

    seen.add(verse.verse_key);

    if (!verse.text_uthmani.trim()) {
      throw new QuranFoundationError(`text_uthmani kosong pada ${verse.verse_key}.`, 502);
    }

    if (!verse.text_indopak.trim()) {
      throw new QuranFoundationError(`text_indopak kosong pada ${verse.verse_key}.`, 502);
    }

    if (!verse.text_uthmani_tajweed.trim()) {
      throw new QuranFoundationError(`text_uthmani_tajweed kosong pada ${verse.verse_key}.`, 502);
    }
  }
}

export function validateQuranSnapshot(chapters, metadata) {
  if (chapters.length !== 114) {
    throw new QuranFoundationError(`Total surat harus 114, diterima ${chapters.length}.`, 502);
  }

  const verseKeys = new Set();
  const expectedByChapter = new Map(metadata.map((surah) => [surah.no, surah.ayat]));

  for (const chapter of chapters) {
    const expectedAyat = expectedByChapter.get(chapter.chapterNumber);

    if (!expectedAyat) {
      throw new QuranFoundationError(`Surah ${chapter.chapterNumber} tidak ada di metadata aplikasi.`, 502);
    }

    validateChapterVerses(chapter.chapterNumber, chapter.verses, expectedAyat);

    for (const verse of chapter.verses) {
      if (verseKeys.has(verse.verse_key)) {
        throw new QuranFoundationError(`verse_key duplikat lintas surat: ${verse.verse_key}.`, 502);
      }

      verseKeys.add(verse.verse_key);
    }
  }
}

export async function fetchChapterFromApi(chapterNumber) {
  const normalizedChapterNumber = assertChapterNumber(chapterNumber);
  const metadata = await loadSurahMetadata();
  const expectedAyat = metadata.find((surah) => surah.no === normalizedChapterNumber)?.ayat;

  if (!expectedAyat) {
    throw new QuranFoundationError(`Surah ${normalizedChapterNumber} tidak ada di metadata aplikasi.`, 500);
  }

  const verses = [];
  let page = 1;

  while (true) {
    const url = new URL(`${QURAN_COM_API_BASE_URL}/verses/by_chapter/${normalizedChapterNumber}`);
    url.searchParams.set('fields', QURAN_FIELDS);
    url.searchParams.set('per_page', String(PER_PAGE));
    url.searchParams.set('page', String(page));

    const response = await fetchWithRetry(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      { label: `surah ${normalizedChapterNumber} page ${page}` },
    );
    const payload = await response.json();
    const pageVerses = Array.isArray(payload.verses) ? payload.verses : [];

    verses.push(...pageVerses.map((verse) => normalizeVerse(verse, normalizedChapterNumber)));

    const totalPages = Number(payload.pagination?.total_pages);
    const reachedLastKnownPage = Number.isFinite(totalPages) && page >= totalPages;
    const reachedShortPage = pageVerses.length < PER_PAGE;

    if (reachedLastKnownPage || reachedShortPage) {
      break;
    }

    page += 1;

    if (page > 20) {
      throw new QuranFoundationError(`Pagination surah ${normalizedChapterNumber} melebihi batas aman.`, 502);
    }
  }

  validateChapterVerses(normalizedChapterNumber, verses, expectedAyat);

  return {
    chapterNumber: normalizedChapterNumber,
    verses,
    source: 'quran-foundation',
    cachedAt: new Date().toISOString(),
  };
}

export async function readCachedChapter(chapterNumber) {
  const normalizedChapterNumber = assertChapterNumber(chapterNumber);
  const filePath = getCacheFilePath(normalizedChapterNumber);
  const raw = await fs.readFile(filePath, 'utf8');
  const payload = JSON.parse(raw);
  const cachedAt = Date.parse(payload.cachedAt ?? '');

  if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > getCacheMaxAgeMs()) {
    return undefined;
  }

  if (!Array.isArray(payload.verses)) {
    return undefined;
  }

  return payload;
}

export async function writeChapterCache(chapter) {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const filePath = getCacheFilePath(chapter.chapterNumber);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = {
    ...chapter,
    cachedAt: new Date().toISOString(),
  };

  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, filePath);

  return payload;
}

function normalizeQuranComCodeV2Verse(raw, chapterNumber) {
  const verseKey = String(raw.verse_key ?? '');
  const verseNumberFromKey = Number(verseKey.split(':')[1]);
  const verseNumber = toPositiveInteger(raw.verse_number ?? raw.verseNumber) ?? toPositiveInteger(verseNumberFromKey);

  return {
    verse_key: verseKey || `${chapterNumber}:${verseNumber ?? ''}`,
    verse_number: verseNumber ?? 0,
    code_v2: String(raw.code_v2 ?? ''),
    v2_page: optionalPositiveInteger(raw.v2_page ?? raw.v2Page),
  };
}

function validateQuranComCodeV2Verses(chapterNumber, verses, expectedAyat) {
  if (!Array.isArray(verses) || verses.length !== expectedAyat) {
    throw new QuranFoundationError(
      `Jumlah code_v2 Quran.com surah ${chapterNumber} tidak cocok. Diharapkan ${expectedAyat}, diterima ${Array.isArray(verses) ? verses.length : 0}.`,
      502,
    );
  }

  const seen = new Set();

  for (const verse of verses) {
    if (!Number.isInteger(verse.verse_number) || verse.verse_number < 1 || verse.verse_number > expectedAyat) {
      throw new QuranFoundationError(`Nomor ayat code_v2 Quran.com tidak valid pada ${verse.verse_key}.`, 502);
    }

    if (seen.has(verse.verse_number)) {
      throw new QuranFoundationError(`Nomor ayat code_v2 Quran.com duplikat pada surah ${chapterNumber}: ${verse.verse_number}.`, 502);
    }

    seen.add(verse.verse_number);

    if (!verse.code_v2.trim()) {
      throw new QuranFoundationError(`code_v2 Quran.com kosong pada ${chapterNumber}:${verse.verse_number}.`, 502);
    }

    if (!Number.isInteger(verse.v2_page) || verse.v2_page < 1 || verse.v2_page > 604) {
      throw new QuranFoundationError(`v2_page Quran.com tidak valid pada ${chapterNumber}:${verse.verse_number}.`, 502);
    }
  }
}

async function readQuranComCodeV2Cache(chapterNumber, expectedAyat) {
  const filePath = getQuranComCodeV2CacheFilePath(chapterNumber);
  const raw = await fs.readFile(filePath, 'utf8');
  const payload = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const cachedAt = Date.parse(payload.cachedAt ?? '');

  if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > getSupplementCacheMaxAgeMs()) {
    return undefined;
  }

  const verses = Array.isArray(payload.verses)
    ? payload.verses.map((verse) => normalizeQuranComCodeV2Verse(verse, chapterNumber))
    : [];

  validateQuranComCodeV2Verses(chapterNumber, verses, expectedAyat);

  return {
    ...payload,
    verses,
  };
}

async function writeQuranComCodeV2Cache(chapterNumber, verses) {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const filePath = getQuranComCodeV2CacheFilePath(chapterNumber);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = {
    chapterNumber,
    verses,
    source: 'quran.com-code-v2',
    cachedAt: new Date().toISOString(),
  };

  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, filePath);

  return payload;
}

async function fetchQuranComCodeV2(chapterNumber, expectedAyat) {
  const url = new URL(`${QURAN_COM_API_BASE_URL}/quran/verses/code_v2`);
  url.searchParams.set('chapter_number', String(chapterNumber));

  const timeoutSignal = AbortSignal.timeout(getSupplementTimeoutMs());
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        Accept: 'application/json',
      },
      signal: timeoutSignal,
    },
    { label: `code_v2 surah ${chapterNumber}`, maxAttempts: 2, provider: 'Quran.com' },
  );
  const payload = await response.json();
  const rawVerses = Array.isArray(payload.verses) ? payload.verses : [];
  const verses = rawVerses.map((verse) => normalizeQuranComCodeV2Verse(verse, chapterNumber));

  validateQuranComCodeV2Verses(chapterNumber, verses, expectedAyat);
  return writeQuranComCodeV2Cache(chapterNumber, verses);
}

async function getQuranComCodeV2(chapterNumber, expectedAyat) {
  try {
    const cached = await readQuranComCodeV2Cache(chapterNumber, expectedAyat);

    if (cached) {
      return {
        ...cached,
        source: 'quran.com-code-v2-cache',
      };
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  return fetchQuranComCodeV2(chapterNumber, expectedAyat);
}

function mergeQuranComCodeV2(chapter, codePayload) {
  const codesByVerse = new Map((codePayload?.verses ?? []).map((verse) => [verse.verse_number, verse]));

  return {
    ...chapter,
    verses: chapter.verses.map((verse) => {
      const codeVerse = codesByVerse.get(verse.verse_number);

      if (!codeVerse) {
        return verse;
      }

      return {
        ...verse,
        code_v2: codeVerse.code_v2,
        v2_page: codeVerse.v2_page,
      };
    }),
    quranComCodeV2Source: codePayload?.source,
  };
}

async function hydrateChapterWithQuranComCodeV2(chapter) {
  try {
    const payload = await getQuranComCodeV2(chapter.chapterNumber, chapter.verses.length);
    return mergeQuranComCodeV2(chapter, payload);
  } catch (error) {
    return {
      ...chapter,
      quranComCodeV2Error: error instanceof Error ? error.message : 'Gagal memuat code_v2 Quran.com.',
    };
  }
}

function validateSupplementVerses(chapterNumber, verses, expectedAyat, label) {
  if (!Array.isArray(verses) || verses.length !== expectedAyat) {
    throw new QuranFoundationError(
      `Jumlah ${label} surah ${chapterNumber} tidak cocok. Diharapkan ${expectedAyat}, diterima ${Array.isArray(verses) ? verses.length : 0}.`,
      502,
    );
  }

  const seen = new Set();

  for (const verse of verses) {
    if (!Number.isInteger(verse.verse_number) || verse.verse_number < 1 || verse.verse_number > expectedAyat) {
      throw new QuranFoundationError(`Nomor ayat ${label} tidak valid pada surah ${chapterNumber}.`, 502);
    }

    if (seen.has(verse.verse_number)) {
      throw new QuranFoundationError(`Nomor ayat ${label} duplikat pada surah ${chapterNumber}: ${verse.verse_number}.`, 502);
    }

    seen.add(verse.verse_number);

    if (typeof verse.text !== 'string' || !verse.text.trim()) {
      throw new QuranFoundationError(`${label} kosong pada surah ${chapterNumber}:${verse.verse_number}.`, 502);
    }
  }
}

async function readSupplementCache(kind, edition, chapterNumber, expectedAyat) {
  const filePath = getSupplementCacheFilePath(kind, edition, chapterNumber);
  const raw = await fs.readFile(filePath, 'utf8');
  const payload = JSON.parse(raw);
  const cachedAt = Date.parse(payload.cachedAt ?? '');

  if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > getSupplementCacheMaxAgeMs()) {
    return undefined;
  }

  validateSupplementVerses(chapterNumber, payload.verses, expectedAyat, kind);
  return payload;
}

async function writeSupplementCache(kind, edition, chapterNumber, verses) {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const filePath = getSupplementCacheFilePath(kind, edition, chapterNumber);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = {
    chapterNumber,
    edition,
    kind,
    verses,
    cachedAt: new Date().toISOString(),
  };

  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, filePath);

  return payload;
}

async function fetchSupplementEdition(chapterNumber, edition, kind, expectedAyat) {
  const url = new URL(`${SUPPLEMENT_API_BASE_URL}/surah/${chapterNumber}/${encodeURIComponent(edition)}`);
  const timeoutSignal = AbortSignal.timeout(getSupplementTimeoutMs());
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        Accept: 'application/json',
      },
      signal: timeoutSignal,
    },
    { label: `${kind} ${edition} surah ${chapterNumber}`, maxAttempts: 2 },
  );
  const payload = await response.json();
  const ayahs = Array.isArray(payload.data?.ayahs) ? payload.data.ayahs : [];
  const verses = ayahs.map((ayah, index) => ({
    verse_number: toPositiveInteger(ayah.numberInSurah) ?? index + 1,
    text: String(ayah.text ?? '').trim(),
  }));

  validateSupplementVerses(chapterNumber, verses, expectedAyat, kind);
  return writeSupplementCache(kind, edition, chapterNumber, verses);
}

async function getSupplementEdition(chapterNumber, edition, kind, expectedAyat) {
  if (!edition || edition.toLowerCase() === 'off' || edition.toLowerCase() === 'false') {
    return undefined;
  }

  try {
    const cached = await readSupplementCache(kind, edition, chapterNumber, expectedAyat);

    if (cached) {
      return {
        ...cached,
        source: 'cache',
      };
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  return fetchSupplementEdition(chapterNumber, edition, kind, expectedAyat);
}

function getSupplementTextByVerse(payload) {
  return new Map((payload?.verses ?? []).map((verse) => [verse.verse_number, verse.text]));
}

export async function getQuranChapterSupplements(chapterNumber) {
  const normalizedChapterNumber = assertChapterNumber(chapterNumber);
  const metadata = await loadSurahMetadata();
  const expectedAyat = metadata.find((surah) => surah.no === normalizedChapterNumber)?.ayat;

  if (!expectedAyat) {
    throw new QuranFoundationError(`Surah ${normalizedChapterNumber} tidak ada di metadata aplikasi.`, 500);
  }

  const [translationResult, transliterationResult] = await Promise.allSettled([
    getSupplementEdition(normalizedChapterNumber, TRANSLATION_EDITION, 'translation', expectedAyat),
    getSupplementEdition(normalizedChapterNumber, TRANSLITERATION_EDITION, 'transliteration', expectedAyat),
  ]);
  const translationPayload = translationResult.status === 'fulfilled' ? translationResult.value : undefined;
  const transliterationPayload = transliterationResult.status === 'fulfilled' ? transliterationResult.value : undefined;
  const translations = getSupplementTextByVerse(translationPayload);
  const transliterations = getSupplementTextByVerse(transliterationPayload);
  const verses = [];

  for (let verseNumber = 1; verseNumber <= expectedAyat; verseNumber += 1) {
    const translation = translations.get(verseNumber);
    const transliteration = transliterations.get(verseNumber);

    if (translation || transliteration) {
      verses.push({
        verse_number: verseNumber,
        translation_id: translation,
        transliteration,
      });
    }
  }

  return {
    chapterNumber: normalizedChapterNumber,
    verses,
    translationSource: translationPayload?.source ?? (translationPayload ? 'alquran.cloud' : undefined),
    transliterationSource: transliterationPayload?.source ?? (transliterationPayload ? 'alquran.cloud' : undefined),
    translationError: translationResult.status === 'rejected' && translationResult.reason instanceof Error ? translationResult.reason.message : undefined,
    transliterationError:
      transliterationResult.status === 'rejected' && transliterationResult.reason instanceof Error ? transliterationResult.reason.message : undefined,
  };
}

export async function getQuranChapter(chapterNumber, options = {}) {
  const normalizedChapterNumber = assertChapterNumber(chapterNumber);

  if (!options.refresh) {
    try {
      const cached = await readCachedChapter(normalizedChapterNumber);

      if (cached) {
        return {
          ...cached,
          source: 'cache',
        };
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const fresh = await fetchChapterFromApi(normalizedChapterNumber);
  const cached = await writeChapterCache(fresh);
  return cached;
}

export async function fetchAllQuranChapters(options = {}) {
  const metadata = await loadSurahMetadata();
  const chapters = [];
  const delayMs = Number.isFinite(Number(options.delayMs)) ? Number(options.delayMs) : 250;

  for (const surah of metadata) {
    const chapter = await fetchChapterFromApi(surah.no);
    chapters.push(chapter);
    options.onProgress?.(chapter);

    if (delayMs > 0) {
      await delay(delayMs);
    }
  }

  validateQuranSnapshot(chapters, metadata);
  return chapters;
}

export async function writeQuranSnapshotCache(chapters) {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  for (const chapter of chapters) {
    await writeChapterCache(chapter);
  }

  const manifest = {
    cachedAt: new Date().toISOString(),
    totalChapters: chapters.length,
    totalVerses: chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0),
    maxAgeDays: 7,
  };
  const manifestPath = path.join(CACHE_DIR, 'manifest.json');
  const manifestTempPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;

  await fs.writeFile(manifestTempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.rename(manifestTempPath, manifestPath);

  return manifest;
}

export async function syncQuranCache(options = {}) {
  requireEnv('QF_CLIENT_ID');
  requireEnv('QF_CLIENT_SECRET');

  const metadata = await loadSurahMetadata();
  const chapters = await fetchAllQuranChapters(options);
  validateQuranSnapshot(chapters, metadata);

  return writeQuranSnapshotCache(chapters);
}

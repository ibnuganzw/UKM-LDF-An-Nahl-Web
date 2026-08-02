export const QURAN_OFFLINE_CACHE = 'annahl-quran-offline-v1';

export const QURAN_DATA_URLS = [
  ...Array.from({ length: 114 }, (_, index) => `/assets/quran-data/chapters/${index + 1}.json`),
  ...Array.from({ length: 114 }, (_, index) => `/assets/quran-data/supplements/${index + 1}.json`),
];

export const QURAN_OFFLINE_URLS = [
  ...QURAN_DATA_URLS,
  '/assets/quran-index/corpus.json',
  '/assets/fonts/quran-common.ttf',
  '/assets/fonts/quran-page-p2.woff2',
];

export interface QuranOfflineStatus {
  available: boolean;
  cached: number;
  total: number;
  complete: boolean;
}

export async function getQuranOfflineStatus(): Promise<QuranOfflineStatus> {
  if (!('caches' in window)) {
    return { available: false, cached: 0, total: QURAN_OFFLINE_URLS.length, complete: false };
  }
  const cache = await caches.open(QURAN_OFFLINE_CACHE);
  const keys = await cache.keys();
  const cached = keys.filter((request) => QURAN_OFFLINE_URLS.some((url) => request.url.endsWith(url))).length;
  return {
    available: true,
    cached,
    total: QURAN_OFFLINE_URLS.length,
    complete: cached >= QURAN_OFFLINE_URLS.length,
  };
}

export async function downloadQuranOfflinePack(
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal,
): Promise<QuranOfflineStatus> {
  if (!('caches' in window)) throw new Error('Penyimpanan offline tidak didukung browser ini.');
  const cache = await caches.open(QURAN_OFFLINE_CACHE);
  let completed = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < QURAN_OFFLINE_URLS.length) {
      if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
      const url = QURAN_OFFLINE_URLS[cursor++];
      const existing = await cache.match(url);
      if (!existing) {
        const response = await fetch(url, { cache: 'no-store', signal });
        if (!response.ok) throw new Error(`Gagal menyimpan ${url}`);
        await cache.put(url, response);
      }
      completed += 1;
      onProgress?.(completed, QURAN_OFFLINE_URLS.length);
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));

  // The first page load may happen before the service worker controls the tab.
  // Copy every already-loaded same-origin app asset into the explicit pack so
  // the shell and the preloaded Quran reader chunks are available offline too.
  const origin = window.location.origin;
  const appAssets = performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.startsWith(origin) && new URL(url).pathname.startsWith('/assets/'));
  await Promise.all(Array.from(new Set(appAssets)).map(async (url) => {
    if (await cache.match(url)) return;
    const response = await fetch(url, { signal });
    if (response.ok) await cache.put(url, response);
  }));
  return getQuranOfflineStatus();
}

export async function clearQuranOfflinePack(): Promise<QuranOfflineStatus> {
  if ('caches' in window) await caches.delete(QURAN_OFFLINE_CACHE);
  return getQuranOfflineStatus();
}

import { loadJSON, saveJSON } from './storage';

export interface PrayerCity {
  id: string;
  lokasi: string;
}

const CITY_STORAGE_KEY = 'annahl_prayer_city';

/** Default when no location has been chosen yet: Kota Banda Aceh, matching this
 * site's home base (LDF An-Nahl is at FKH USK, Darussalam, Aceh Besar). */
export const DEFAULT_PRAYER_CITY: PrayerCity = { id: '0119', lokasi: 'KOTA BANDA ACEH' };

export function loadSavedPrayerCity(): PrayerCity | null {
  return loadJSON<PrayerCity | null>(CITY_STORAGE_KEY, null);
}

export function savePrayerCity(city: PrayerCity): void {
  saveJSON(CITY_STORAGE_KEY, city);
}

/** Indonesia has three fixed UTC offsets (no DST), assigned by province. Matched
 * by keyword against the API's `daerah` field (e.g. "ACEH", "KALIMANTAN TIMUR")
 * rather than an exhaustive exact-name table, since the handful of provinces
 * that aren't WIB are easy to identify by a short keyword and everything else
 * (all of Sumatra/Java plus West & Central Kalimantan) safely defaults to WIB. */
export function getUtcOffsetHours(daerah: string): number {
  const d = daerah.toUpperCase();

  if (d.includes('PAPUA') || d.includes('MALUKU')) {
    return 9; // WIT
  }

  if (
    d.includes('BALI') ||
    d.includes('NUSA TENGGARA') ||
    d.includes('SULAWESI') ||
    d.includes('GORONTALO') ||
    d.includes('KALIMANTAN SELATAN') ||
    d.includes('KALIMANTAN TIMUR') ||
    d.includes('KALIMANTAN UTARA')
  ) {
    return 8; // WITA
  }

  return 7; // WIB (default — Sumatra, Java, West & Central Kalimantan)
}

export function getZoneLabel(daerah: string): 'WIB' | 'WITA' | 'WIT' {
  const offset = getUtcOffsetHours(daerah);
  if (offset === 9) return 'WIT';
  if (offset === 8) return 'WITA';
  return 'WIB';
}

export async function searchPrayerCities(keyword: string, signal?: AbortSignal): Promise<PrayerCity[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }

  const response = await fetch(`https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(trimmed)}`, { signal });
  if (!response.ok) {
    throw new Error('Gagal mencari kota.');
  }

  const payload = (await response.json()) as { status: boolean; data?: PrayerCity[] };
  return payload.status && Array.isArray(payload.data) ? payload.data : [];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Wraps the browser geolocation API in a promise that never rejects — permission
 * denial, timeout, or an unsupported browser all just resolve to null so callers
 * can treat "couldn't get a location" as one simple case. */
export function requestBrowserLocation(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}

/** Reverse-geocodes to the Indonesian regency/city name (kabupaten/kota level —
 * the granularity the prayer-time API's city list uses), via OpenStreetMap's
 * free Nominatim service. Returns null if nothing usable comes back. */
async function reverseGeocodeRegency(coords: Coordinates, signal?: AbortSignal): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(coords.latitude));
  url.searchParams.set('lon', String(coords.longitude));
  url.searchParams.set('zoom', '10');
  url.searchParams.set('addressdetails', '1');

  // Nominatim's usage policy rejects requests with no identifying Referer/User-Agent
  // (browsers always send a real User-Agent, which JS can't override anyway, but
  // referrerPolicy is set explicitly here rather than relying on the default so a
  // Referer is always attached too).
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' }, referrerPolicy: 'origin' });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { address?: { county?: string; city?: string; state?: string } };
  const regency = payload.address?.county ?? payload.address?.city;
  return regency ?? null;
}

/** Best-effort: browser coordinates -> regency name -> matching prayer-time city.
 * Returns null at any step that comes up empty rather than throwing, since this
 * whole flow is a convenience on top of the manual city picker, never the only
 * way to set a location. */
export async function resolveCityFromCoordinates(coords: Coordinates, signal?: AbortSignal): Promise<PrayerCity | null> {
  const regency = await reverseGeocodeRegency(coords, signal);
  if (!regency) {
    return null;
  }

  const matches = await searchPrayerCities(regency, signal);
  return matches[0] ?? null;
}

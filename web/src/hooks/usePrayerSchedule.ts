import { useCallback, useEffect, useState } from 'react';
import { fetchPrayerSchedule, type PrayerScheduleResponse, type PrayerTime } from '../lib/prayer';
import { loadJSON, saveJSON } from '../lib/storage';
import {
  DEFAULT_PRAYER_CITY,
  getUtcOffsetHours,
  getZoneLabel,
  loadSavedPrayerCity,
  requestBrowserLocation,
  resolveCityFromCoordinates,
  savePrayerCity,
  type PrayerCity,
} from '../lib/prayerLocation';

export interface UsePrayerScheduleResult {
  city: PrayerCity;
  lokasi: string;
  prayerTimes: PrayerTime[];
  utcOffsetHours: number;
  zoneLabel: string;
  status: 'loading' | 'ready' | 'error';
  source: 'live' | 'cached' | 'unavailable';
  message?: string;
  retry: () => void;
  setCity: (city: PrayerCity) => void;
  detectLocation: () => Promise<void>;
  locating: boolean;
  locateError: string | null;
}

interface CachedPrayerSchedule extends PrayerScheduleResponse {
  cityId: string;
  dayKey: string;
  savedAt: string;
}

const PRAYER_CACHE_KEY = 'annahl_prayer_schedule_v1';

function getDayKey(date: Date, utcOffsetHours: number): string {
  const zoned = new Date(date.getTime() + utcOffsetHours * 3_600_000);
  return `${zoned.getUTCFullYear()}-${String(zoned.getUTCMonth() + 1).padStart(2, '0')}-${String(zoned.getUTCDate()).padStart(2, '0')}`;
}

function loadCachedSchedule(cityId: string, dayKey: string): CachedPrayerSchedule | null {
  const cached = loadJSON<CachedPrayerSchedule | null>(PRAYER_CACHE_KEY, null);
  return cached?.cityId === cityId && cached.dayKey === dayKey ? cached : null;
}

/** Owns the selected prayer-time city (persisted to localStorage) and its fetched
 * schedule. Used by every page that shows prayer info (Home, Dashboard, Shalat)
 * so they always agree — one source of truth instead of each page independently
 * calling the API. */
export function usePrayerSchedule(now: Date): UsePrayerScheduleResult {
  const [city, setCityState] = useState<PrayerCity>(() => loadSavedPrayerCity() ?? DEFAULT_PRAYER_CITY);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [daerah, setDaerah] = useState('ACEH');
  const [lokasi, setLokasi] = useState(city.lokasi);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [source, setSource] = useState<'live' | 'cached' | 'unavailable'>('unavailable');
  const [message, setMessage] = useState<string | undefined>();
  const [retryKey, setRetryKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const utcOffsetHours = getUtcOffsetHours(daerah);
  const zoneLabel = getZoneLabel(daerah);

  // Re-derive once per calendar day (viewer-local date) rather than every tick.
  const dayKey = getDayKey(now, utcOffsetHours);

  useEffect(() => {
    const controller = new AbortController();
    const [year, month, day] = dayKey.split('-').map(Number);
    const requestDate = new Date(year, month - 1, day);
    const cached = loadCachedSchedule(city.id, dayKey);
    if (cached) {
      setPrayerTimes(cached.prayerTimes);
      setDaerah(cached.daerah || 'ACEH');
      setLokasi(cached.lokasi || city.lokasi);
      setSource('cached');
    } else {
      setPrayerTimes([]);
      setSource('unavailable');
    }
    setStatus('loading');
    setMessage(undefined);

    fetchPrayerSchedule(city.id, requestDate, controller.signal)
      .then((schedule) => {
        setPrayerTimes(schedule.prayerTimes);
        setDaerah(schedule.daerah || 'ACEH');
        setLokasi(schedule.lokasi || city.lokasi);
        setSource('live');
        setStatus('ready');
        setMessage(undefined);
        saveJSON(PRAYER_CACHE_KEY, {
          ...schedule,
          cityId: city.id,
          dayKey,
          savedAt: new Date().toISOString(),
        } satisfies CachedPrayerSchedule);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSource(cached ? 'cached' : 'unavailable');
        setStatus('error');
        const reason = error instanceof Error ? error.message : 'Gagal memuat jadwal shalat.';
        setMessage(cached ? `${reason} Menampilkan jadwal tersimpan untuk tanggal ini.` : `${reason} Jadwal perkiraan tidak ditampilkan.`);
      });

    return () => controller.abort();
  }, [city.id, city.lokasi, dayKey, retryKey]);

  const setCity = useCallback((next: PrayerCity) => {
    setCityState(next);
    setLokasi(next.lokasi);
    savePrayerCity(next);
  }, []);

  const retry = useCallback(() => setRetryKey((key) => key + 1), []);

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setLocateError(null);

    const coords = await requestBrowserLocation();
    if (!coords) {
      setLocateError('Tidak bisa mengakses lokasi. Pastikan izin lokasi diizinkan, atau pilih kota secara manual.');
      setLocating(false);
      return;
    }

    const resolved = await resolveCityFromCoordinates(coords);
    if (!resolved) {
      setLocateError('Lokasimu terdeteksi, tapi kotanya tidak ditemukan di data jadwal shalat. Coba pilih kota secara manual.');
      setLocating(false);
      return;
    }

    setCity(resolved);
    setLocating(false);
  }, [setCity]);

  return {
    city,
    lokasi,
    prayerTimes,
    utcOffsetHours,
    zoneLabel,
    status,
    source,
    message,
    retry,
    setCity,
    detectLocation,
    locating,
    locateError,
  };
}

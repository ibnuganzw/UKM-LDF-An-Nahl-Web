import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PRAYER_TIMES, fetchPrayerSchedule, type PrayerTime } from '../lib/prayer';
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
  message?: string;
  setCity: (city: PrayerCity) => void;
  detectLocation: () => Promise<void>;
  locating: boolean;
  locateError: string | null;
}

/** Owns the selected prayer-time city (persisted to localStorage) and its fetched
 * schedule. Used by every page that shows prayer info (Home, Dashboard, Shalat)
 * so they always agree — one source of truth instead of each page independently
 * calling the API. */
export function usePrayerSchedule(now: Date): UsePrayerScheduleResult {
  const [city, setCityState] = useState<PrayerCity>(() => loadSavedPrayerCity() ?? DEFAULT_PRAYER_CITY);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>(DEFAULT_PRAYER_TIMES);
  const [daerah, setDaerah] = useState('ACEH');
  const [lokasi, setLokasi] = useState(city.lokasi);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | undefined>();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const utcOffsetHours = getUtcOffsetHours(daerah);
  const zoneLabel = getZoneLabel(daerah);

  // Re-derive once per calendar day (viewer-local date) rather than every tick.
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    fetchPrayerSchedule(city.id, now, controller.signal)
      .then((schedule) => {
        setPrayerTimes(schedule.prayerTimes);
        setDaerah(schedule.daerah || 'ACEH');
        setLokasi(schedule.lokasi || city.lokasi);
        setStatus('ready');
        setMessage(undefined);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Gagal memuat jadwal shalat.');
      });

    return () => controller.abort();
  }, [city.id, dayKey]);

  const setCity = useCallback((next: PrayerCity) => {
    setCityState(next);
    setLokasi(next.lokasi);
    savePrayerCity(next);
  }, []);

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

  return { city, lokasi, prayerTimes, utcOffsetHours, zoneLabel, status, message, setCity, detectLocation, locating, locateError };
}

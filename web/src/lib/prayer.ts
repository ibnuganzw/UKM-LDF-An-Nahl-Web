export interface PrayerTime {
  name: string;
  time: string;
}

/** Shown instantly before the first fetch resolves, and as a last-resort fallback
 * if the schedule fetch fails outright. Banda Aceh's typical schedule — a
 * reasonable placeholder anywhere in Aceh, and replaced by the real fetched
 * schedule for whichever city is actually selected. */
export const DEFAULT_PRAYER_TIMES: PrayerTime[] = [
  { name: 'Subuh', time: '05:12' },
  { name: 'Syuruq', time: '06:29' },
  { name: 'Dzuhur', time: '12:41' },
  { name: 'Ashar', time: '16:05' },
  { name: 'Maghrib', time: '18:48' },
  { name: 'Isya', time: '20:01' },
];

function toSeconds(hhmm: string): number {
  if (!hhmm) return 0;
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 3600 + mm * 60;
}

export interface NextPrayerInfo {
  index: number;
  name: string;
  time: string;
  countdown: string;
}

export interface PrayerScheduleResponse {
  prayerTimes: PrayerTime[];
  daerah: string;
  lokasi: string;
}

export async function fetchPrayerSchedule(cityId: string, date: Date, signal?: AbortSignal): Promise<PrayerScheduleResponse> {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  const response = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${cityId}/${yyyy}/${mm}/${dd}`, { signal });
  if (!response.ok) {
    throw new Error('Gagal memuat jadwal shalat.');
  }

  const payload = (await response.json()) as {
    status: boolean;
    data?: { daerah?: string; lokasi?: string; jadwal?: Record<string, string> };
  };

  if (!payload.status || !payload.data?.jadwal) {
    throw new Error('Jadwal shalat tidak ditemukan untuk kota ini.');
  }

  const j = payload.data.jadwal;

  return {
    prayerTimes: [
      { name: 'Subuh', time: j.subuh ?? '' },
      { name: 'Syuruq', time: j.terbit ?? '' },
      { name: 'Dzuhur', time: j.dzuhur ?? '' },
      { name: 'Ashar', time: j.ashar ?? '' },
      { name: 'Maghrib', time: j.maghrib ?? '' },
      { name: 'Isya', time: j.isya ?? '' },
    ],
    daerah: payload.data.daerah ?? '',
    lokasi: payload.data.lokasi ?? '',
  };
}

/** A Date whose UTC getters read as the wall-clock date/time at a fixed UTC
 * offset — Indonesia has no DST, so this arithmetic shift is exact, and it's
 * independent of whatever timezone the viewer's own device happens to be set
 * to (the bug this replaces: comparing a city's prayer times against
 * `now.getHours()`, which is the *viewer's* local time, not the city's). */
export function toZonedInstant(instant: Date, utcOffsetHours: number): Date {
  return new Date(instant.getTime() + utcOffsetHours * 3600_000);
}

export function getNextPrayer(now: Date, prayerTimes: PrayerTime[], utcOffsetHours: number): NextPrayerInfo {
  const zoned = toZonedInstant(now, utcOffsetHours);
  const nowSec = zoned.getUTCHours() * 3600 + zoned.getUTCMinutes() * 60 + zoned.getUTCSeconds();

  let nextIdx = -1;
  for (let i = 0; i < prayerTimes.length; i++) {
    if (i === 1) continue; // Syuruq (sunrise) isn't a prayer to count down to
    if (toSeconds(prayerTimes[i].time) > nowSec) {
      nextIdx = i;
      break;
    }
  }

  let target: number;
  if (nextIdx === -1) {
    nextIdx = 0;
    target = toSeconds(prayerTimes[0].time) + 86400 - nowSec;
  } else {
    target = toSeconds(prayerTimes[nextIdx].time) - nowSec;
  }

  const pad = (x: number) => String(x).padStart(2, '0');
  const countdown = `${pad(Math.floor(target / 3600))}:${pad(Math.floor((target % 3600) / 60))}:${pad(target % 60)}`;

  return { index: nextIdx, name: prayerTimes[nextIdx].name, time: prayerTimes[nextIdx].time, countdown };
}

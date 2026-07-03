export interface PrayerTime {
  name: string;
  time: string;
}

/** Static example schedule for the prototype's default city (Banda Aceh, Aceh). */
export const PRAYER_TIMES: PrayerTime[] = [
  { name: 'Subuh', time: '05:12' },
  { name: 'Syuruq', time: '06:29' },
  { name: 'Dzuhur', time: '12:41' },
  { name: 'Ashar', time: '16:05' },
  { name: 'Maghrib', time: '18:48' },
  { name: 'Isya', time: '20:01' },
];

function toSeconds(hhmm: string): number {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 3600 + mm * 60;
}

export interface NextPrayerInfo {
  index: number;
  name: string;
  time: string;
  countdown: string;
}

export function getNextPrayer(now: Date): NextPrayerInfo {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let nextIdx = -1;
  for (let i = 0; i < PRAYER_TIMES.length; i++) {
    if (i === 1) continue; // Syuruq (sunrise) isn't a prayer to count down to
    if (toSeconds(PRAYER_TIMES[i].time) > nowSec) {
      nextIdx = i;
      break;
    }
  }
  let target: number;
  if (nextIdx === -1) {
    nextIdx = 0;
    target = toSeconds(PRAYER_TIMES[0].time) + 86400 - nowSec;
  } else {
    target = toSeconds(PRAYER_TIMES[nextIdx].time) - nowSec;
  }
  const pad = (x: number) => String(x).padStart(2, '0');
  const countdown = `${pad(Math.floor(target / 3600))}:${pad(Math.floor((target % 3600) / 60))}:${pad(target % 60)}`;
  return { index: nextIdx, name: PRAYER_TIMES[nextIdx].name, time: PRAYER_TIMES[nextIdx].time, countdown };
}

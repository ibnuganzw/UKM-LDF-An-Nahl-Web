export interface IslamicHoliday {
  name: string;
  /** Local calendar date in YYYY-MM-DD form. */
  date: string;
}

/**
 * Dates already approved for the 2026 site calendar. A future year's dates are
 * deliberately not guessed: when this list is exhausted, the hero keeps its
 * marker but shows an honest update state instead of claiming the last event is
 * "Hari Ini" forever.
 */
export const ISLAMIC_HOLIDAYS_2026: IslamicHoliday[] = [
  { name: 'Isra Mikraj', date: '2026-01-16' },
  { name: "Nisfu Sya'ban", date: '2026-02-03' },
  { name: '1 Ramadhan 1447 H', date: '2026-02-19' },
  { name: "Nuzulul Qur'an", date: '2026-03-07' },
  { name: 'Idul Fitri 1447 H', date: '2026-03-21' },
  { name: 'Hari Arafah', date: '2026-05-26' },
  { name: 'Idul Adha 1447 H', date: '2026-05-27' },
  { name: 'Tahun Baru Islam 1448 H', date: '2026-06-16' },
  { name: 'Maulid Nabi SAW', date: '2026-08-25' },
];

export interface HolidayCountdown {
  name: string;
  countdown: string;
  available: boolean;
}

function localDateAtMidnight(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getIslamicHolidayCountdown(
  now: Date,
  holidays: IslamicHoliday[] = ISLAMIC_HOLIDAYS_2026,
): HolidayCountdown {
  const dated = holidays
    .map((holiday) => ({ ...holiday, instant: localDateAtMidnight(holiday.date) }))
    .filter((holiday) => !Number.isNaN(holiday.instant.getTime()))
    .sort((a, b) => a.instant.getTime() - b.instant.getTime());

  const today = dated.find((holiday) => isSameLocalDay(holiday.instant, now));
  if (today) {
    return { name: today.name, countdown: 'Hari ini', available: true };
  }

  const next = dated.find((holiday) => holiday.instant.getTime() > now.getTime());
  if (!next) {
    return {
      name: 'Kalender Hijriah',
      countdown: 'Menunggu tanggal resmi berikutnya',
      available: false,
    };
  }

  const diff = next.instant.getTime() - now.getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const countdown = days > 0
    ? `${days} hari ${hours} jam lagi`
    : hours > 0
      ? `${hours} jam ${minutes} mnt lagi`
      : `${Math.max(minutes, 0)} mnt lagi`;

  return { name: next.name, countdown, available: true };
}

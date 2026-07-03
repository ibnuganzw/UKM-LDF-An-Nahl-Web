export const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MON = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function dayOffsetToDate(offset: number): Date {
  return addDays(startOfToday(), offset);
}

export function formatAgendaDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MON[date.getMonth()]}`;
}

export function formatFullDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MON[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatRelative(date: Date): string {
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const t = date.getTime();
  if (t === today.getTime()) return 'Hari ini';
  if (t === tomorrow.getTime()) return 'Besok';
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MON3[date.getMonth()]}`;
}

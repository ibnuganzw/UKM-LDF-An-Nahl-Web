/** Static placeholder Hijri date — not calculated. Needs a real Hijri conversion in production. */
export function formatHijriDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat('id-ID-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return `Perkiraan ${formatted}`;
}

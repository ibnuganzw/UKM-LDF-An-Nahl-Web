/** Estimates reading time from article HTML at ~200 words/minute. */
export function estimateReadMins(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

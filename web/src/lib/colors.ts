import type { AgendaStatus, AgendaType, ArticleCategory } from '../types';

export const TYPE_COLORS: Record<AgendaType, string> = {
  Kajian: 'var(--type-kajian)',
  Rapat: 'var(--type-rapat)',
  Mentoring: 'var(--type-mentoring)',
  Sosial: 'var(--type-sosial)',
  Olahraga: 'var(--type-olahraga)',
  Rihlah: 'var(--type-rihlah)',
  'Open Recruitment': 'var(--type-oprec)',
};

export const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  'Islam Veteriner': 'var(--cat-vet)',
  Kisah: 'var(--cat-kisah)',
  Renungan: 'var(--cat-renungan)',
};

export const STATUS_COLORS: Record<AgendaStatus, string> = {
  Selesai: 'var(--status-done)',
  'Hari ini': 'var(--status-today)',
  'Akan datang': 'var(--status-upcoming)',
};

/** Builds a translucent wash for either a literal color or a themed CSS color token. */
export function soft(color: string, alpha = '1F'): string {
  const opacity = Math.round((Number.parseInt(alpha, 16) / 255) * 1000) / 10;
  return `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}

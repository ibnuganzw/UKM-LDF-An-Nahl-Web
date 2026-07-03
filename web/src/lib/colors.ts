import type { AgendaStatus, AgendaType, ArticleCategory } from '../types';

export const TYPE_COLORS: Record<AgendaType, string> = {
  Kajian: '#8FAAF5',
  Rapat: '#9AA8C9',
  Mentoring: '#5CCBA0',
  Sosial: '#E8C766',
  Olahraga: '#5FC6DE',
  Rihlah: '#C39BE8',
  'Open Recruitment': '#EE9AC0',
};

export const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  'Islam Veteriner': '#8FAAF5',
  Kisah: '#E8C766',
  Renungan: '#5FC6DE',
};

export const STATUS_COLORS: Record<AgendaStatus, string> = {
  Selesai: '#8E99BB',
  'Hari ini': '#5CCBA0',
  'Akan datang': '#8FAAF5',
};

/** Appends a 2-digit hex alpha suffix, matching the prototype's `color + '1F'` badge-background pattern. */
export function soft(hex: string, alpha = '1F'): string {
  return hex + alpha;
}

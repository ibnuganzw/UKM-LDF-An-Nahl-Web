import type { AgendaType, ArticleCategory } from '../types';

export const AGENDA_FILTERS: ('Semua' | AgendaType)[] = [
  'Semua', 'Kajian', 'Rapat', 'Mentoring', 'Sosial', 'Olahraga', 'Rihlah', 'Open Recruitment',
];

export const KONTEN_FILTERS: ('Semua' | ArticleCategory)[] = [
  'Semua', 'Islam Veteriner', 'Kisah', 'Renungan',
];

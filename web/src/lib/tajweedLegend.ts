import type { QuranVerse } from '../types';

export interface TajweedLegendItem {
  className: string;
  label: string;
  description: string;
  color: string;
}

export const TAJWEED_LEGEND: Record<string, TajweedLegendItem> = {
  ham_wasl: {
    className: 'ham_wasl',
    label: 'Hamzah wasal',
    description: 'Hamzah yang dibaca saat memulai bacaan.',
    color: 'var(--tajweed-ham-wasl)',
  },
  slnt: {
    className: 'slnt',
    label: 'Silent',
    description: 'Huruf yang tidak dibunyikan dalam bacaan.',
    color: 'var(--tajweed-silent)',
  },
  madda_normal: {
    className: 'madda_normal',
    label: 'Mad normal',
    description: 'Panjang bacaan dasar.',
    color: 'var(--tajweed-madda-normal)',
  },
  madda_permissible: {
    className: 'madda_permissible',
    label: 'Mad jaiz',
    description: 'Panjang bacaan yang diperbolehkan.',
    color: 'var(--tajweed-madda-permissible)',
  },
  madda_necessary: {
    className: 'madda_necessary',
    label: 'Mad lazim',
    description: 'Panjang bacaan yang diperlukan.',
    color: 'var(--tajweed-madda-necessary)',
  },
  madda_obligatory: {
    className: 'madda_obligatory',
    label: 'Mad wajib',
    description: 'Panjang bacaan wajib.',
    color: 'var(--tajweed-madda-obligatory)',
  },
  qalaqah: {
    className: 'qalaqah',
    label: 'Qalqalah',
    description: 'Pantulan suara pada huruf tertentu.',
    color: 'var(--tajweed-qalqalah)',
  },
  ikhafa: {
    className: 'ikhafa',
    label: 'Ikhfa',
    description: 'Bacaan samar dengan dengung.',
    color: 'var(--tajweed-ikhafa)',
  },
  ikhafa_shafawi: {
    className: 'ikhafa_shafawi',
    label: 'Ikhfa syafawi',
    description: 'Bacaan samar pada mim sukun.',
    color: 'var(--tajweed-ikhafa-shafawi)',
  },
  iqlab: {
    className: 'iqlab',
    label: 'Iqlab',
    description: 'Perubahan bunyi nun sukun atau tanwin menjadi mim.',
    color: 'var(--tajweed-iqlab)',
  },
  idgham_ghunnah: {
    className: 'idgham_ghunnah',
    label: 'Idgham bighunnah',
    description: 'Bacaan melebur dengan dengung.',
    color: 'var(--tajweed-idgham-ghunnah)',
  },
  idgham_wo_ghunnah: {
    className: 'idgham_wo_ghunnah',
    label: 'Idgham bilaghunnah',
    description: 'Bacaan melebur tanpa dengung.',
    color: 'var(--tajweed-idgham-wo-ghunnah)',
  },
  idgham_shafawi: {
    className: 'idgham_shafawi',
    label: 'Idgham syafawi',
    description: 'Mim sukun melebur ke mim berikutnya.',
    color: 'var(--tajweed-idgham-shafawi)',
  },
  idgham_mutajanisayn: {
    className: 'idgham_mutajanisayn',
    label: 'Idgham mutajanisain',
    description: 'Huruf berdekatan makhraj melebur dalam bacaan.',
    color: 'var(--tajweed-idgham-mutajanisayn)',
  },
  idgham_mutaqaribayn: {
    className: 'idgham_mutaqaribayn',
    label: 'Idgham mutaqaribain',
    description: 'Huruf yang berdekatan melebur dalam bacaan.',
    color: 'var(--tajweed-idgham-mutaqaribayn)',
  },
  ghunnah: {
    className: 'ghunnah',
    label: 'Ghunnah',
    description: 'Dengung pada nun atau mim.',
    color: 'var(--tajweed-ghunnah)',
  },
};

const TAJWEED_CLASS_PATTERN = /<(?:tajweed|span)\b[^>]*\bclass\s*=\s*["']([^"']+)["'][^>]*>/gi;

export function scanTajweedClasses(verses: QuranVerse[]): string[] {
  const classes = new Set<string>();

  for (const verse of verses) {
    TAJWEED_CLASS_PATTERN.lastIndex = 0;

    for (const match of verse.text_uthmani_tajweed.matchAll(TAJWEED_CLASS_PATTERN)) {
      for (const className of match[1].split(/\s+/)) {
        const cleanClassName = className.trim();

        if (cleanClassName) {
          classes.add(cleanClassName);
        }
      }
    }
  }

  return [...classes].sort((a, b) => a.localeCompare(b));
}

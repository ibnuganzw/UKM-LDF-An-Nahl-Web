import { describe, expect, it } from 'vitest';
import { scanTajweedClasses, TAJWEED_LEGEND } from './tajweedLegend';
import type { QuranVerse } from '../types';

function verseWithTajweed(text: string): QuranVerse {
  return {
    id: 1,
    verse_key: '2:1',
    chapter_id: 2,
    verse_number: 1,
    text_uthmani: 'الم',
    text_indopak: '',
    text_uthmani_tajweed: text,
    translation_id: 'Alif Lam Mim.',
  };
}

describe('tajweed legend', () => {
  it('reads quoted and unquoted classes from Quran markup while ignoring verse markers', () => {
    const verses = [verseWithTajweed([
      '<tajweed class=madda_necessary>لٓ</tajweed>',
      '<tajweed class="ghunnah emphasized">ن</tajweed>',
      "<tajweed class='laam_shamsiyah'>ل</tajweed>",
      '<span class=end>١</span>',
    ].join(''))];

    expect(scanTajweedClasses(verses)).toEqual([
      'emphasized',
      'ghunnah',
      'laam_shamsiyah',
      'madda_necessary',
    ]);
  });

  it('maps lam syamsiyah to a reader-facing legend entry', () => {
    expect(TAJWEED_LEGEND.laam_shamsiyah).toMatchObject({
      label: 'Lam syamsiyah',
      color: 'var(--tajweed-laam-shamsiyah)',
    });
  });
});

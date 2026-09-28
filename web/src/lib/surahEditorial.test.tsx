import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SurahInfoDialog } from '../components/SurahInfoDialog';
import { SurahHeader } from '../components/SurahHeader';
import { JUZS } from '../data/juzs';
import { REVIEWED_SURAH_INFO } from '../data/reviewedSurahInfo';
import { SURAH_INFO } from '../data/surahInfo';
import { SURAHS } from '../data/surahs';
import type { SurahInfo, SurahInfoSection } from '../types';
import { canShowSurahExplanation, DISPUTED_REVELATION_SURAHS } from './surahEditorial';

const sections: SurahInfoSection[] = ['ringkasan', 'konteks', 'kandungan', 'hikmah'];
const sample = SURAH_INFO[0];

function reviewedInfo(): SurahInfo {
  return {
    ...sample,
    reviewStatus: 'reviewed',
    reviewEvidence: {
      reviewer: 'Penelaah contoh',
      reviewedAt: '2026-09-28',
      citations: sections.map((section) => ({
        section,
        source: 'Kitab contoh',
        locator: 'jilid 1, halaman 10',
      })),
    },
  };
}

describe('surah editorial release guard', () => {
  it('keeps the current 114 unreviewed explanations out of public presentation', () => {
    expect(SURAH_INFO).toHaveLength(114);
    expect(SURAH_INFO.every((info) => !canShowSurahExplanation(info))).toBe(true);
    expect(REVIEWED_SURAH_INFO.every(canShowSurahExplanation)).toBe(true);

    const markup = renderToStaticMarkup(
      <SurahInfoDialog surah={SURAHS[0]} revelationPlace="Makkiyah" onClose={() => {}} />,
    );
    expect(markup).toContain('Dalam penelaahan editorial');
    expect(markup).toContain('quran.kemenag.go.id/quran/per-ayat/surah/1');
    expect(markup).not.toContain(sample.ringkasanSingkat);
    expect(markup).not.toContain('role="tablist"');
    expect(markup).not.toContain('Wahyu ke-');
  });

  it('requires a named reviewer, valid date, and located sources for every section', () => {
    const reviewed = reviewedInfo();
    expect(canShowSurahExplanation(reviewed)).toBe(true);
    expect(canShowSurahExplanation({ ...reviewed, reviewEvidence: undefined })).toBe(false);
    expect(canShowSurahExplanation({
      ...reviewed,
      reviewEvidence: { ...reviewed.reviewEvidence!, reviewer: ' ' },
    })).toBe(false);
    expect(canShowSurahExplanation({
      ...reviewed,
      reviewEvidence: { ...reviewed.reviewEvidence!, reviewedAt: '2026-02-30' },
    })).toBe(false);
    expect(canShowSurahExplanation({
      ...reviewed,
      reviewEvidence: { ...reviewed.reviewEvidence!, citations: reviewed.reviewEvidence!.citations.slice(1) },
    })).toBe(false);
    expect(canShowSurahExplanation({
      ...reviewed,
      reviewEvidence: { ...reviewed.reviewEvidence!, citations: undefined as unknown as NonNullable<SurahInfo['reviewEvidence']>['citations'] },
    })).toBe(false);
  });

  it('keeps basic juz metadata complete for all surahs without shipping editorial prose', () => {
    for (const surah of SURAHS) {
      expect(JUZS.some((juz) => juz.verse_mapping[String(surah.no)] !== undefined)).toBe(true);
    }
  });

  it('keeps the verified numerical correction and disputed revelation label visible', () => {
    const alMaarij = SURAH_INFO.find((info) => info.no === 70)!;
    expect(JSON.stringify(alMaarij)).not.toContain('50. tahun');
    expect(alMaarij.konteksTurun).toContain('50.000 tahun');

    expect(SURAH_INFO.filter((info) => info.tempatTurunCatatan).map((info) => info.no))
      .toEqual(DISPUTED_REVELATION_SURAHS);

    for (const no of [113, 114]) {
      const info = SURAH_INFO.find((item) => item.no === no)!;
      expect(info.tempatTurunCatatan).toContain('diperselisihkan');
      const markup = renderToStaticMarkup(
        <SurahInfoDialog surah={SURAHS[no - 1]} revelationPlace="Makkiyah" onClose={() => {}} />,
      );
      expect(markup).toContain('Tempat turun diperselisihkan');
      const header = renderToStaticMarkup(
        <SurahHeader chapterId={no} revelationPlace="Makkiyah" versesCount={SURAHS[no - 1].ayat} />,
      );
      expect(header).toContain('aria-label="Tempat turun diperselisihkan"');
      expect(header).not.toContain('>makkah</span>');
    }
  });
});

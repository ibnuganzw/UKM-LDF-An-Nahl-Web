import type { SurahInfo, SurahInfoSection } from '../types';

const REQUIRED_SECTIONS: SurahInfoSection[] = ['ringkasan', 'konteks', 'kandungan', 'hikmah'];

// Keep this lightweight for the reader header; editorial source notes are excluded from public bundles.
export const DISPUTED_REVELATION_SURAHS = [13, 20, 22, 55, 64, 76, 83, 98, 99, 107, 113, 114];
const disputedRevelationSurahs = new Set(DISPUTED_REVELATION_SURAHS);

export function isRevelationPlaceDisputed(surahNo: number): boolean {
  return disputedRevelationSurahs.has(surahNo);
}

function validReviewDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** A review label alone never releases unverified tafsir to public readers. */
export function canShowSurahExplanation(info: SurahInfo | undefined): boolean {
  if (info?.reviewStatus !== 'reviewed') return false;
  const evidence = info.reviewEvidence;
  if (!evidence?.reviewer.trim() || !validReviewDate(evidence.reviewedAt) || !Array.isArray(evidence.citations)) return false;

  return REQUIRED_SECTIONS.every((section) =>
    evidence.citations.some((citation) =>
      citation.section === section && citation.source.trim() && citation.locator.trim(),
    ),
  );
}

import { SURAHS } from '../data/surahs';
import type { QuranVerse } from '../types';

export const DEFAULT_QURAN_COLLECTION = 'Favorit';

export interface QuranBookmark {
  id: string;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  surahName: string;
  arabic: string;
  translation: string;
  collection: string;
  path: string;
  createdAt: string;
}

export interface QuranReadingProgress {
  path: string;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  label: string;
  updatedAt: string;
}

export function normalizeCollectionName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 36);
}

export function normalizeCollections(value: unknown): string[] {
  const input = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const result = [DEFAULT_QURAN_COLLECTION];
  seen.add(DEFAULT_QURAN_COLLECTION.toLocaleLowerCase('id-ID'));

  input.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const name = normalizeCollectionName(entry);
    const key = name.toLocaleLowerCase('id-ID');
    if (!name || seen.has(key)) return;
    seen.add(key);
    result.push(name);
  });

  return result.slice(0, 12);
}

export function normalizeBookmarks(value: unknown): QuranBookmark[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<QuranBookmark>;
    if (
      typeof item.verseKey !== 'string' ||
      typeof item.chapterId !== 'number' ||
      typeof item.verseNumber !== 'number' ||
      typeof item.path !== 'string' ||
      typeof item.collection !== 'string'
    ) return [];
    const collection = normalizeCollectionName(item.collection) || DEFAULT_QURAN_COLLECTION;
    const id = `${collection.toLocaleLowerCase('id-ID')}::${item.verseKey}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      verseKey: item.verseKey,
      chapterId: item.chapterId,
      verseNumber: item.verseNumber,
      surahName: typeof item.surahName === 'string' ? item.surahName : `Surah ${item.chapterId}`,
      arabic: typeof item.arabic === 'string' ? item.arabic : '',
      translation: typeof item.translation === 'string' ? item.translation : '',
      collection,
      path: item.path,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
    }];
  });
}

export function createQuranBookmark(
  verse: QuranVerse,
  collection: string,
  path: string,
  createdAt = new Date().toISOString(),
): QuranBookmark {
  const normalizedCollection = normalizeCollectionName(collection) || DEFAULT_QURAN_COLLECTION;
  const surahName = SURAHS.find((surah) => surah.no === verse.chapter_id)?.name ?? `Surah ${verse.chapter_id}`;
  return {
    id: `${normalizedCollection.toLocaleLowerCase('id-ID')}::${verse.verse_key}`,
    verseKey: verse.verse_key,
    chapterId: verse.chapter_id,
    verseNumber: verse.verse_number,
    surahName,
    arabic: verse.text_uthmani || verse.text_indopak,
    translation: verse.translation_id ?? '',
    collection: normalizedCollection,
    path,
    createdAt,
  };
}

export function toggleQuranBookmark(
  bookmarks: QuranBookmark[],
  bookmark: QuranBookmark,
): QuranBookmark[] {
  const exists = bookmarks.some((item) => item.id === bookmark.id);
  return exists
    ? bookmarks.filter((item) => item.id !== bookmark.id)
    : [bookmark, ...bookmarks].slice(0, 500);
}

export function isVerseBookmarked(
  bookmarks: QuranBookmark[],
  verseKey: string,
  collection: string,
): boolean {
  const collectionKey = normalizeCollectionName(collection).toLocaleLowerCase('id-ID');
  return bookmarks.some(
    (item) => item.verseKey === verseKey && item.collection.toLocaleLowerCase('id-ID') === collectionKey,
  );
}

export function createReadingProgress(
  verse: QuranVerse,
  path: string,
  label: string,
  updatedAt = new Date().toISOString(),
): QuranReadingProgress {
  return {
    path,
    verseKey: verse.verse_key,
    chapterId: verse.chapter_id,
    verseNumber: verse.verse_number,
    label,
    updatedAt,
  };
}

import type { QuranSearchMode, QuranSearchResult } from '../../types';

export type QuranCorpusRow = [key: string, arabic: string, translation: string, transliteration: string];

export interface QuranSearchEngine {
  docs: unknown[];
  vowelIndex: Map<string, Array<{ docId: number; start: number }>>;
  noVowelIndex: Map<string, Array<{ docId: number; start: number }>>;
}

export interface RunSearchOptions {
  query: string;
  mode: QuranSearchMode;
  respectVowels: boolean;
  limit?: number;
}

export function createEngine(verses: QuranCorpusRow[]): QuranSearchEngine;

export function runSearch(engine: QuranSearchEngine, options: RunSearchOptions): QuranSearchResult[];

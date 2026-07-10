/// <reference lib="webworker" />
// Web Worker that hosts the Qur'an phonetic search engine. It lazily fetches the
// prebuilt corpus, builds the trigram + translation indexes once, then answers
// search requests. Running off the main thread keeps typing responsive even
// while the ~6k-verse index is built.

import { createEngine, runSearch } from './searchEngine.mjs';
import type { QuranSearchEngine } from './searchEngine.mjs';
import type { QuranSearchMode, QuranSearchResult } from '../../types';

interface CorpusPayload {
  totalVerses: number;
  verses: Array<[string, string, string, string]>;
}

export interface SearchRequestMessage {
  type: 'search';
  id: number;
  query: string;
  mode: QuranSearchMode;
  respectVowels: boolean;
  limit: number;
}

export type SearchWorkerResponse =
  | { type: 'ready'; totalVerses: number }
  | { type: 'result'; id: number; results: QuranSearchResult[]; totalVerses: number }
  | { type: 'error'; id: number | null; message: string };

const CORPUS_URL = `${import.meta.env.BASE_URL}assets/quran-index/corpus.json`;

let engine: QuranSearchEngine | null = null;
let totalVerses = 0;
let initPromise: Promise<void> | null = null;

async function ensureEngine(): Promise<void> {
  if (engine) {
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const response = await fetch(CORPUS_URL, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Gagal memuat indeks Al-Qur'an (${response.status}).`);
      }
      const payload = (await response.json()) as CorpusPayload;
      engine = createEngine(payload.verses);
      totalVerses = payload.totalVerses ?? payload.verses.length;
      const ready: SearchWorkerResponse = { type: 'ready', totalVerses };
      (self as DedicatedWorkerGlobalScope).postMessage(ready);
    })();
  }
  await initPromise;
}

self.addEventListener('message', (event: MessageEvent<SearchRequestMessage>) => {
  const message = event.data;
  if (!message || message.type !== 'search') {
    return;
  }

  void (async () => {
    try {
      await ensureEngine();
      if (!engine) {
        throw new Error("Mesin pencarian Al-Qur'an belum siap.");
      }
      const results: QuranSearchResult[] = runSearch(engine, {
        query: message.query,
        mode: message.mode,
        respectVowels: message.respectVowels,
        limit: message.limit,
      });
      const response: SearchWorkerResponse = { type: 'result', id: message.id, results, totalVerses };
      (self as DedicatedWorkerGlobalScope).postMessage(response);
    } catch (error) {
      const response: SearchWorkerResponse = {
        type: 'error',
        id: message.id,
        message: error instanceof Error ? error.message : "Gagal mencari ayat Al-Qur'an.",
      };
      (self as DedicatedWorkerGlobalScope).postMessage(response);
    }
  })();
});

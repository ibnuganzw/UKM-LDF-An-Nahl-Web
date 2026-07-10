import type { QuranSearchMode, QuranSearchResponse } from '../types';
import type { SearchRequestMessage, SearchWorkerResponse } from './quran/searchWorker';

interface QuranSearchOptions {
  limit?: number;
  mode: QuranSearchMode;
  query: string;
  respectVowels: boolean;
  signal?: AbortSignal;
}

interface PendingRequest {
  resolve: (value: QuranSearchResponse) => void;
  reject: (reason: Error) => void;
  query: string;
  mode: QuranSearchMode;
  respectVowels: boolean;
}

let worker: Worker | null = null;
let requestCounter = 0;
const pending = new Map<number, PendingRequest>();

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL('./quran/searchWorker.ts', import.meta.url), { type: 'module' });

  worker.addEventListener('message', (event: MessageEvent<SearchWorkerResponse>) => {
    const message = event.data;

    if (message.type === 'result') {
      const request = pending.get(message.id);
      if (!request) {
        return;
      }
      pending.delete(message.id);
      request.resolve({
        query: request.query,
        mode: request.mode,
        respectVowels: request.respectVowels,
        totalVerses: message.totalVerses,
        results: message.results,
      });
    } else if (message.type === 'error' && message.id !== null) {
      const request = pending.get(message.id);
      if (!request) {
        return;
      }
      pending.delete(message.id);
      request.reject(new Error(message.message));
    }
  });

  worker.addEventListener('error', (event) => {
    const message = event.message || "Gagal memuat mesin pencarian Al-Qur'an.";
    for (const [id, request] of pending) {
      request.reject(new Error(message));
      pending.delete(id);
    }
  });

  return worker;
}

/**
 * Warm up the search worker (fetch corpus + build index) ahead of the first
 * query so results feel instant. Safe to call repeatedly.
 */
export function primeQuranSearch(): void {
  getWorker();
}

export function fetchQuranSearch(options: QuranSearchOptions): Promise<QuranSearchResponse> {
  const activeWorker = getWorker();
  const id = (requestCounter += 1);

  return new Promise<QuranSearchResponse>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    pending.set(id, {
      resolve,
      reject,
      query: options.query,
      mode: options.mode,
      respectVowels: options.respectVowels,
    });

    options.signal?.addEventListener(
      'abort',
      () => {
        if (pending.delete(id)) {
          reject(new DOMException('Aborted', 'AbortError'));
        }
      },
      { once: true },
    );

    const message: SearchRequestMessage = {
      type: 'search',
      id,
      query: options.query,
      mode: options.mode,
      respectVowels: options.respectVowels,
      limit: options.limit ?? 20,
    };
    activeWorker.postMessage(message);
  });
}

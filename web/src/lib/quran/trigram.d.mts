export type TrigramIndex = Map<string, Array<{ docId: number; start: number }>>;

export interface TrigramSearchResult {
  docId: number;
  confidence: number;
  positions: Array<[number, number]>;
}

export function buildTrigramIndex(docs: Array<{ id: number; phonetic: string }>): TrigramIndex;

export function searchTrigrams(
  index: TrigramIndex,
  phoneticQuery: string,
  minConfidence?: number,
): TrigramSearchResult[];

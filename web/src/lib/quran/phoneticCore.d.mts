export function normalizeString(input: string): string;
export function fromArabic(text: string): string;
export function stripVowels(phonetic: string): string;
export function nGrams(s: string, n?: number): string[];
export function nGramsWithPos(s: string, n?: number): Array<{ text: string; start: number }>;

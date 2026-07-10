// Best-effort, presentation-only match highlighting for search result cards.
// This never touches the search engine or its ranking — it just re-derives which
// words to visually mark, given the query and a piece of result text.

import { canonicalId } from './variants.mjs';
import { normalizeString } from './phoneticCore.mjs';

export interface HighlightSegment {
  text: string;
  match: boolean;
}

export interface Highlighter {
  translation: (text: string) => HighlightSegment[];
  lafaz: (text: string) => HighlightSegment[];
}

function cleanWord(word: string): string {
  return word.replace(/[^\p{L}\p{N}]/gu, '');
}

function segment(text: string, matches: (cleaned: string) => boolean): HighlightSegment[] {
  if (!text) {
    return [];
  }
  const parts = text.split(/(\s+)/);
  const segments: HighlightSegment[] = [];
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const cleaned = cleanWord(part);
    const isMatch = cleaned.length > 0 && matches(cleaned);
    const last = segments[segments.length - 1];
    if (last && last.match === isMatch) {
      last.text += part;
    } else {
      segments.push({ text: part, match: isMatch });
    }
  }
  return segments;
}

export function createHighlighter(query: string): Highlighter {
  const queryCanonical = new Set(
    query
      .split(/\s+/)
      .map((word) => canonicalId(cleanWord(word)))
      .filter((token) => token.length > 1),
  );
  const queryPhonetic = normalizeString(query);

  return {
    translation: (text) => segment(text, (cleaned) => queryCanonical.has(canonicalId(cleaned))),
    lafaz: (text) =>
      segment(text, (cleaned) => {
        const phonetic = normalizeString(cleaned);
        return phonetic.length >= 3 && queryPhonetic.length >= 3 && queryPhonetic.includes(phonetic);
      }),
  };
}

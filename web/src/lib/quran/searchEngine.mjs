// Qur'an search engine: builds the phonetic + translation indexes over the
// prebuilt corpus and answers queries across three modes:
//   - lafaz:       Lafzi-style phonetic trigram search over the Arabic text
//   - translation: Indonesian meaning search (stem + fuzzy token coverage)
//   - arabic:      direct substring match when the query itself is Arabic
//
// Framework-free ESM so it runs both inside the browser worker and the Node
// accuracy test harness.

import { fromArabic, normalizeString, stripVowels, nGrams } from './phoneticCore.mjs';
import { buildTrigramIndex, searchTrigrams } from './trigram.mjs';
import { canonicalId } from './variants.mjs';

const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const LAFAZ_MIN_CONFIDENCE = 0.4;
const TRANSLATION_MIN_COVERAGE = 0.6;
const ID_STOP_WORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'itu', 'ini', 'pada', 'untuk', 'dengan',
  'adalah', 'akan', 'atau', 'kepada', 'dalam', 'oleh', 'para', 'maka', 'agar',
]);

function normalizeArabic(value) {
  return String(value ?? '')
    .replace(ARABIC_MARKS, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^ء-ي]/g, '');
}

function meaningTokens(value) {
  return normalizeString2(value)
    .split(' ')
    .filter((token) => token.length > 1);
}

// Lowercase, fold accents, keep letters/spaces. (Distinct from the phonetic
// normalizeString; used for the Indonesian translation text.)
function normalizeString2(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordTrigramSet(word) {
  const padded = `  ${word}  `;
  return new Set(nGrams(padded, 3));
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) {
      intersection += 1;
    }
  }
  return intersection / (a.size + b.size - intersection);
}

function fuzzyWordSimilarity(query, docWord, queryGrams) {
  if (query === docWord) {
    return 1;
  }
  const minLen = Math.min(query.length, docWord.length);
  if (minLen >= 4 && (docWord.includes(query) || query.includes(docWord))) {
    return 0.9;
  }
  if (query.length < 4 || docWord.length < 4) {
    return 0;
  }
  return jaccard(queryGrams, wordTrigramSet(docWord));
}

/**
 * Build the search engine over corpus verses.
 * @param {Array<[string, string, string, string]>} verses  [key, arabic, translation_id, transliteration]
 */
export function createEngine(verses) {
  const docs = verses.map((row, index) => {
    const [key, arabic, translation, transliteration] = row;
    const [chapterStr, verseStr] = String(key).split(':');
    const phonetic = fromArabic(arabic);
    const translationNorm = normalizeString2(translation);
    const tokens = translationNorm.split(' ').filter(Boolean);
    return {
      id: index,
      verse_key: key,
      chapter_id: Number(chapterStr) || 0,
      verse_number: Number(verseStr) || 0,
      text_uthmani: arabic,
      translation_id: translation,
      transliteration,
      arabicNorm: normalizeArabic(arabic),
      phoneticVowel: phonetic,
      phoneticNoVowel: stripVowels(phonetic),
      translationNorm,
      docWords: [...new Set(tokens)],
      docStems: [...new Set(tokens.map(canonicalId))],
    };
  });

  const vowelIndex = buildTrigramIndex(docs.map((doc) => ({ id: doc.id, phonetic: doc.phoneticVowel })));
  const noVowelIndex = buildTrigramIndex(docs.map((doc) => ({ id: doc.id, phonetic: doc.phoneticNoVowel })));

  return { docs, vowelIndex, noVowelIndex };
}

function mergeMax(target, index, phoneticQuery, penalty = 1) {
  if (phoneticQuery.length < 3) {
    return;
  }
  const hits = searchTrigrams(index, phoneticQuery, LAFAZ_MIN_CONFIDENCE);
  for (const hit of hits) {
    const score = Math.round(hit.confidence * 100 * penalty);
    const existing = target.get(hit.docId);
    if (existing === undefined || score > existing) {
      target.set(hit.docId, score);
    }
  }
}

// The vowel index is precise for diphthong/mad-sensitive queries (e.g. kautsar),
// while the consonant-skeleton index is more forgiving for long phrases where
// vowel guesses accumulate errors (e.g. Ayat Kursi). By default we query both
// and keep the better score per verse; "respect vowels" restricts to the strict
// vowel index only.
function searchLafaz(engine, rawQuery, respectVowels) {
  const normalized = normalizeString(rawQuery);
  const scores = new Map();
  mergeMax(scores, engine.vowelIndex, normalized, 1);
  if (!respectVowels) {
    // Penalize the no-vowel score by 0.85 so that true vowel matches rank higher.
    mergeMax(scores, engine.noVowelIndex, stripVowels(normalized), 0.85);
  }
  return scores;
}

function searchTranslation(engine, rawQuery) {
  const queryTokens = meaningTokens(rawQuery);
  const meaningful = queryTokens.filter((token) => !ID_STOP_WORDS.has(token));
  const effectiveTokens = meaningful.length > 0 ? meaningful : queryTokens;
  if (effectiveTokens.length === 0) {
    return new Map();
  }

  const queryStems = effectiveTokens.map((token) => {
    const stem = canonicalId(token);
    return { stem, grams: wordTrigramSet(stem) };
  });
  const phrase = normalizeString2(rawQuery);
  const scores = new Map();

  for (const doc of engine.docs) {
    if (!doc.translationNorm) {
      continue;
    }

    let matchedSimilarity = 0;
    let matchedCount = 0;
    for (const query of queryStems) {
      let best = 0;
      for (const stem of doc.docStems) {
        const similarity = fuzzyWordSimilarity(query.stem, stem, query.grams);
        if (similarity > best) {
          best = similarity;
          if (best === 1) {
            break;
          }
        }
      }
      if (best >= 0.72) {
        matchedCount += 1;
        matchedSimilarity += best;
      }
    }

    const coverage = matchedCount / queryStems.length;
    if (coverage < TRANSLATION_MIN_COVERAGE) {
      continue;
    }

    const avgSimilarity = matchedSimilarity / matchedCount;
    let score = 45 + coverage * 35 + avgSimilarity * 15;
    if (phrase.length >= 4 && doc.translationNorm.includes(phrase)) {
      score = Math.max(score, 96);
    }
    scores.set(doc.id, Math.round(Math.min(100, score)));
  }

  return scores;
}

function searchArabic(engine, rawQuery) {
  const arabicQuery = normalizeArabic(rawQuery);
  if (arabicQuery.length < 2) {
    return new Map();
  }
  const scores = new Map();
  for (const doc of engine.docs) {
    if (doc.arabicNorm.includes(arabicQuery)) {
      scores.set(doc.id, 97);
    }
  }
  return scores;
}

/**
 * Run a search.
 * @returns {Array<object>} ranked result rows.
 */
export function runSearch(engine, options) {
  const rawQuery = String(options.query ?? '').trim();
  const mode = options.mode ?? 'all';
  const respectVowels = Boolean(options.respectVowels);
  const limit = Number.isInteger(options.limit) ? options.limit : 20;
  const hasArabic = /[؀-ۿ]/.test(rawQuery);

  const merged = new Map();
  const addScores = (scores, field) => {
    for (const [docId, score] of scores) {
      const existing = merged.get(docId);
      if (!existing) {
        merged.set(docId, { score, fields: new Set([field]) });
      } else {
        existing.score = Math.max(existing.score, score);
        existing.fields.add(field);
      }
    }
  };

  if (mode === 'all' || mode === 'lafaz') {
    addScores(searchLafaz(engine, rawQuery, respectVowels), 'lafaz');
  }
  if (mode === 'all' || mode === 'translation') {
    addScores(searchTranslation(engine, rawQuery), 'translation');
  }
  if ((mode === 'all' || mode === 'lafaz') && hasArabic) {
    addScores(searchArabic(engine, rawQuery), 'arabic');
  }

  const ranked = [...merged.entries()]
    .map(([docId, value]) => ({ doc: engine.docs[docId], score: value.score, fields: value.fields }))
    .sort((a, b) => b.score - a.score
      || a.doc.chapter_id - b.doc.chapter_id
      || a.doc.verse_number - b.doc.verse_number)
    .slice(0, limit);

  return ranked.map((entry) => ({
    verse_key: entry.doc.verse_key,
    chapter_id: entry.doc.chapter_id,
    verse_number: entry.doc.verse_number,
    text_uthmani: entry.doc.text_uthmani,
    transliteration: entry.doc.transliteration,
    translation_id: entry.doc.translation_id,
    score: entry.score,
    matched_fields: [...entry.fields],
  }));
}

import { AL_FATIHAH } from '../data/surahs';
import { JUZS } from '../data/juzs';
import type { QuranVerse, QuranVerseSupplement } from '../types';

interface QuranChapterResponse {
  chapterNumber: number;
  verses: QuranVerse[];
  cachedAt?: string;
  source?: string;
}

interface QuranSupplementResponse {
  chapterNumber: number;
  verses: QuranVerseSupplement[];
  translationSource?: string;
  transliterationSource?: string;
  translationError?: string;
  transliterationError?: string;
}

const LOCAL_SUPPLEMENTS: Record<number, QuranVerseSupplement[]> = {
  1: AL_FATIHAH.map((ayah) => ({
    verse_number: ayah.n,
    transliteration: ayah.latin,
    translation_id: ayah.id,
  })),
  2: [
    {
      verse_number: 1,
      transliteration: 'alif lam mim',
      translation_id: 'Alif Lam Mim.',
    },
    {
      verse_number: 2,
      transliteration: 'zalikal-kitabu la raiba fih, hudal lil-muttaqin',
      translation_id: "Kitab (Al-Qur'an) ini tidak ada keraguan padanya; petunjuk bagi mereka yang bertakwa,",
    },
    {
      verse_number: 3,
      transliteration: "allazina yu'minuna bil-gaibi wa yuqimunas-salata wa mimma razaqnahum yunfiqun",
      translation_id:
        'yaitu mereka yang beriman kepada yang gaib, menegakkan salat, dan menginfakkan sebagian rezeki yang Kami berikan kepada mereka,',
    },
    {
      verse_number: 4,
      transliteration: "wallazina yu'minuna bima unzila ilaika wa ma unzila min qablik, wa bil-akhirati hum yuqinin",
      translation_id:
        "dan mereka yang beriman kepada apa yang diturunkan kepadamu dan apa yang diturunkan sebelum engkau, serta yakin akan adanya akhirat.",
    },
    {
      verse_number: 5,
      transliteration: "ula'ika 'ala hudam mir rabbihim wa ula'ika humul-muflihun",
      translation_id: 'Merekalah yang mendapat petunjuk dari Tuhannya, dan mereka itulah orang-orang yang beruntung.',
    },
  ],
};

function getLocalSupplements(chapterNumber: number): QuranVerseSupplement[] {
  return LOCAL_SUPPLEMENTS[chapterNumber] ?? [];
}

export function mergeQuranSupplements(verses: QuranVerse[], supplements: QuranVerseSupplement[]): QuranVerse[] {
  if (supplements.length === 0) {
    return verses;
  }

  const supplementsByVerse = new Map(supplements.map((supplement) => [supplement.verse_number, supplement]));

  return verses.map((verse) => {
    const supplement = supplementsByVerse.get(verse.verse_number);

    if (!supplement) {
      return verse;
    }

    return {
      ...verse,
      transliteration: verse.transliteration ?? supplement.transliteration,
      translation_id: verse.translation_id ?? supplement.translation_id,
    };
  });
}

function applyLocalSupplements(chapterNumber: number, verses: QuranVerse[]): QuranVerse[] {
  return mergeQuranSupplements(verses, getLocalSupplements(chapterNumber));
}

export function getFallbackQuranVerses(chapterNumber: number): QuranVerse[] {
  if (chapterNumber !== 1) {
    return [];
  }

  return AL_FATIHAH.map((ayah) => ({
    id: ayah.n,
    verse_key: `1:${ayah.n}`,
    chapter_id: 1,
    verse_number: ayah.n,
    text_uthmani: ayah.ar,
    text_indopak: ayah.ar,
    text_uthmani_tajweed: ayah.ar,
    transliteration: ayah.latin,
    translation_id: ayah.id,
  }));
}

export async function fetchQuranChapter(chapterNumber: number, signal?: AbortSignal): Promise<QuranChapterResponse> {
  const response = await fetch(`/assets/quran-data/chapters/${chapterNumber}.json`, { signal });

  if (!response.ok) {
    throw new Error(`Gagal memuat surah ${chapterNumber}.`);
  }

  const payload = (await response.json()) as QuranChapterResponse;

  if (!Array.isArray(payload.verses)) {
    throw new Error('Response Quran tidak valid.');
  }

  return {
    ...payload,
    verses: applyLocalSupplements(payload.chapterNumber, payload.verses),
  };
}

export async function fetchQuranSupplements(chapterNumber: number, signal?: AbortSignal): Promise<QuranSupplementResponse> {
  const response = await fetch(`/assets/quran-data/supplements/${chapterNumber}.json`, { signal });

  if (!response.ok) {
    throw new Error(`Gagal memuat transliterasi dan terjemahan surah ${chapterNumber}.`);
  }

  const payload = (await response.json()) as QuranSupplementResponse;

  if (!Array.isArray(payload.verses)) {
    throw new Error('Response transliterasi dan terjemahan Quran tidak valid.');
  }

  return {
    ...payload,
    verses: [...getLocalSupplements(chapterNumber), ...payload.verses],
  };
}

export async function fetchQuranJuz(juzNumber: number, signal?: AbortSignal) {
  const juz = JUZS.find((j) => Number(j.juz_number) === juzNumber);
  if (!juz) {
    throw new Error(`Juz ${juzNumber} tidak ditemukan`);
  }

  const verses: QuranVerse[] = [];
  const sources = new Set<string>();

  for (const [chapterStr, range] of Object.entries(juz.verse_mapping)) {
    if (signal?.aborted) return { juzNumber, verses: [], source: '' };

    const chapterNumber = Number(chapterStr);
    const [start, end] = range.split('-').map(Number);
    const chapterData = await fetchQuranChapter(chapterNumber, signal);
    
    if (chapterData.source) {
      sources.add(chapterData.source);
    }

    const filtered = chapterData.verses.filter((v) => v.verse_number >= start && v.verse_number <= end);
    verses.push(...filtered);
  }

  return {
    juzNumber,
    verses,
    source: Array.from(sources).join(', '),
  };
}

export async function fetchQuranJuzSupplements(juzNumber: number, signal?: AbortSignal) {
  const juz = JUZS.find((j) => Number(j.juz_number) === juzNumber);
  if (!juz) {
    throw new Error(`Juz ${juzNumber} tidak ditemukan`);
  }

  const verses: QuranVerseSupplement[] = [];
  const translationSources = new Set<string>();
  const transliterationSources = new Set<string>();

  for (const [chapterStr, range] of Object.entries(juz.verse_mapping)) {
    if (signal?.aborted) return { juzNumber, verses: [] };

    const chapterNumber = Number(chapterStr);
    const [start, end] = range.split('-').map(Number);
    const chapterSupplements = await fetchQuranSupplements(chapterNumber, signal);

    if (chapterSupplements.translationSource) {
      translationSources.add(chapterSupplements.translationSource);
    }
    if (chapterSupplements.transliterationSource) {
      transliterationSources.add(chapterSupplements.transliterationSource);
    }

    const filtered = chapterSupplements.verses
      .filter((v) => v.verse_number >= start && v.verse_number <= end)
      .map((v) => ({ ...v, chapter_id: chapterNumber }));
    verses.push(...filtered);
  }

  return {
    juzNumber,
    verses,
    translationSource: Array.from(translationSources).join(', '),
    transliterationSource: Array.from(transliterationSources).join(', '),
  };
}

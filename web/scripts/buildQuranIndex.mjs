// Build the static Qur'an search corpus shipped to the browser.
//
// For every one of the 114 surahs it collects the fully-vowelled Uthmani text,
// the Indonesian translation, and the Latin transliteration, then writes a
// single compact JSON asset. The browser search worker loads this asset and
// builds the phonetic trigram index locally, so search works offline and in the
// production static build (no server required).
//
// Data sources are public and need no credentials:
//   - Verses (text_uthmani): Quran.com API v4
//   - Translation (id.indonesian) + transliteration (en.transliteration): alquran.cloud
//
// Usage: npm run quran:index

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getQuranChapter,
  getQuranChapterSupplements,
  loadSurahMetadata,
} from '../server/quranFoundation.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = path.join(WEB_ROOT, 'public', 'assets', 'quran-index');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'corpus.json');
const DELAY_MS = Number(process.env.QURAN_INDEX_DELAY_MS ?? 200);

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function collapseWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

async function collectChapter(chapterNumber) {
  const chapter = await getQuranChapter(chapterNumber);
  let supplementsByVerse = new Map();

  try {
    const supplements = await getQuranChapterSupplements(chapterNumber);
    supplementsByVerse = new Map(supplements.verses.map((verse) => [verse.verse_number, verse]));
  } catch (error) {
    console.warn(`  ! Surah ${chapterNumber} supplements gagal: ${error instanceof Error ? error.message : error}`);
  }

  return chapter.verses.map((verse) => {
    const supplement = supplementsByVerse.get(verse.verse_number) ?? {};
    return [
      verse.verse_key,
      collapseWhitespace(verse.text_uthmani),
      collapseWhitespace(verse.translation_id ?? supplement.translation_id ?? ''),
      collapseWhitespace(verse.transliteration ?? supplement.transliteration ?? ''),
    ];
  });
}

async function main() {
  const metadata = await loadSurahMetadata();
  const verses = [];
  let missingTranslations = 0;

  for (const surah of metadata) {
    const rows = await collectChapter(surah.no);
    for (const row of rows) {
      if (!row[2]) {
        missingTranslations += 1;
      }
      verses.push(row);
    }
    console.log(`Surah ${String(surah.no).padStart(3, '0')} (${surah.name}): ${rows.length} ayat`);

    if (DELAY_MS > 0) {
      await delay(DELAY_MS);
    }
  }

  const expectedTotal = metadata.reduce((sum, surah) => sum + surah.ayat, 0);
  if (verses.length !== expectedTotal) {
    throw new Error(`Total ayat tidak cocok: diharapkan ${expectedTotal}, diperoleh ${verses.length}.`);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    fields: ['key', 'arabic', 'translation_id', 'transliteration'],
    totalVerses: verses.length,
    verses,
  };
  const tempPath = `${OUTPUT_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(payload), 'utf8');
  await fs.rename(tempPath, OUTPUT_PATH);

  const bytes = (await fs.stat(OUTPUT_PATH)).size;
  console.log('');
  console.log(`Corpus ditulis: ${OUTPUT_PATH}`);
  console.log(`  ${verses.length} ayat, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  if (missingTranslations > 0) {
    console.warn(`  ! ${missingTranslations} ayat tanpa terjemahan Indonesia.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

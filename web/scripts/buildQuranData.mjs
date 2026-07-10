// Build static per-chapter Qur'an reading data shipped to the browser.
//
// QuranReader/JuzReader used to fetch this from a Vite dev-server-only
// /api/quran/chapters/:n endpoint (server/viteQuranFoundationPlugin.mjs),
// whose configureServer hook never runs outside `npm run dev` — every
// chapter but Al-Fatihah silently failed to load in any production build.
// This script bakes the same data (already fetched once via `npm run
// quran:sync`, cached under .cache/quran-foundation) into public static
// assets instead, so reading works identically in dev and prod with no
// server involved — mirroring buildQuranIndex.mjs's approach for search.
//
// Usage: npm run quran:data

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getQuranChapter, getQuranChapterSupplements, loadSurahMetadata } from '../server/quranFoundation.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = path.join(WEB_ROOT, 'public', 'assets', 'quran-data');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const SUPPLEMENTS_DIR = path.join(OUTPUT_DIR, 'supplements');
const DELAY_MS = Number(process.env.QURAN_DATA_DELAY_MS ?? 150);

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function writeJson(filePath, payload) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(payload), 'utf8');
  await fs.rename(tempPath, filePath);
}

async function main() {
  const metadata = await loadSurahMetadata();
  await fs.mkdir(CHAPTERS_DIR, { recursive: true });
  await fs.mkdir(SUPPLEMENTS_DIR, { recursive: true });

  let totalVerses = 0;
  let missingSupplements = 0;

  for (const surah of metadata) {
    const chapter = await getQuranChapter(surah.no);
    await writeJson(path.join(CHAPTERS_DIR, `${surah.no}.json`), chapter);
    totalVerses += chapter.verses.length;

    try {
      const supplements = await getQuranChapterSupplements(surah.no);
      await writeJson(path.join(SUPPLEMENTS_DIR, `${surah.no}.json`), supplements);
    } catch (error) {
      missingSupplements += 1;
      console.warn(`  ! Surah ${surah.no} supplements gagal: ${error instanceof Error ? error.message : error}`);
    }

    console.log(`Surah ${String(surah.no).padStart(3, '0')} (${surah.name}): ${chapter.verses.length} ayat`);

    if (DELAY_MS > 0) {
      await delay(DELAY_MS);
    }
  }

  const expectedTotal = metadata.reduce((sum, surah) => sum + surah.ayat, 0);
  if (totalVerses !== expectedTotal) {
    throw new Error(`Total ayat tidak cocok: diharapkan ${expectedTotal}, diperoleh ${totalVerses}.`);
  }

  console.log('');
  console.log(`Data Qur'an ditulis ke ${OUTPUT_DIR}`);
  console.log(`  ${metadata.length} surah, ${totalVerses} ayat total.`);
  if (missingSupplements > 0) {
    console.warn(`  ! ${missingSupplements} surah tanpa file supplements (lihat peringatan di atas).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

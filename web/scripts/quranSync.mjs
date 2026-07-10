import { syncQuranCache } from '../server/quranFoundation.mjs';

const delayMs = Number(process.env.QF_SYNC_DELAY_MS ?? 300);

try {
  const manifest = await syncQuranCache({
    delayMs,
    onProgress(chapter) {
      console.log(`Synced surah ${chapter.chapterNumber}: ${chapter.verses.length} ayat`);
    },
  });

  console.log(
    `Quran sync complete: ${manifest.totalChapters} surat, ${manifest.totalVerses} ayat, cached at ${manifest.cachedAt}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

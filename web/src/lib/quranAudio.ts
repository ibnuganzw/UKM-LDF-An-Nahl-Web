import { SURAHS } from '../data/surahs';

export interface QuranReciter {
  id: string;
  name: string;
  bitrate: number;
}

/** Islamic Network / alquran.cloud edition ids. Bitrate is per-reciter — the CDN
 * only hosts specific bitrates for each edition (verified against the live CDN,
 * not all editions have a 128kbps file; some only serve 64 or 192). */
export const RECITERS: QuranReciter[] = [
  { id: 'ar.alafasy', name: 'Mishary Rasyid Al-Afasy', bitrate: 128 },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit Abdus Samad', bitrate: 192 },
  { id: 'ar.abdurrahmaansudais', name: 'Abdurrahman As-Sudais', bitrate: 192 },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', bitrate: 128 },
  { id: 'ar.minshawi', name: 'Muhammad Shiddiq Al-Minshawi', bitrate: 128 },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly', bitrate: 128 },
  { id: 'ar.saoodshuraym', name: 'Saud Al-Shuraim', bitrate: 64 },
  { id: 'ar.hudhaify', name: 'Ali Al-Hudhaify', bitrate: 128 },
  { id: 'ar.ahmedajamy', name: 'Ahmad Al-Ajami', bitrate: 128 },
];

export const DEFAULT_RECITER_ID = RECITERS[0].id;

const FALLBACK_BITRATE = 64;
const AUDIO_CDN_BASE = 'https://cdn.islamic.network/quran/audio';

const surahAyahOffsets = new Map<number, number>();

(() => {
  let total = 0;
  for (const surah of [...SURAHS].sort((a, b) => a.no - b.no)) {
    surahAyahOffsets.set(surah.no, total);
    total += surah.ayat;
  }
})();

export function isKnownReciter(id: string): boolean {
  return RECITERS.some((reciter) => reciter.id === id);
}

export function getReciter(id: string): QuranReciter {
  return RECITERS.find((reciter) => reciter.id === id) ?? RECITERS[0];
}

/** Global 1-6236 ayah numbering used by the alquran.cloud/islamic.network audio CDN,
 * counted from Al-Fatihah 1:1 regardless of surah boundaries. */
export function getGlobalAyahNumber(surahNumber: number, ayahNumber: number): number {
  return (surahAyahOffsets.get(surahNumber) ?? 0) + ayahNumber;
}

export function getAyahAudioUrl(reciterId: string, surahNumber: number, ayahNumber: number): string {
  const globalNumber = getGlobalAyahNumber(surahNumber, ayahNumber);
  return `${AUDIO_CDN_BASE}/${getReciter(reciterId).bitrate}/${reciterId}/${globalNumber}.mp3`;
}

/** Lower-bitrate URL every known edition serves, used as a retry when the primary bitrate 404s. */
export function getAyahAudioFallbackUrl(reciterId: string, surahNumber: number, ayahNumber: number): string {
  const globalNumber = getGlobalAyahNumber(surahNumber, ayahNumber);
  return `${AUDIO_CDN_BASE}/${FALLBACK_BITRATE}/${reciterId}/${globalNumber}.mp3`;
}

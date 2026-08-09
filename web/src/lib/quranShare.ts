import { SURAHS } from '../data/surahs';
import type { QuranVerse } from '../types';

export function buildVerseShareText(verse: QuranVerse): string {
  const surah = SURAHS.find((item) => item.no === verse.chapter_id);
  const reference = `QS. ${surah?.name ?? `Surah ${verse.chapter_id}`}: ${verse.verse_number}`;
  return [
    verse.text_uthmani || verse.text_indopak,
    verse.translation_id ? `“${verse.translation_id}”` : '',
    reference,
    'LDF An-Nahl FKH USK',
  ].filter(Boolean).join('\n\n');
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

export async function createVerseCardBlob(verse: QuranVerse): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas tidak tersedia di browser ini.');

  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, '#0A1128');
  gradient.addColorStop(.58, '#111D3F');
  gradient.addColorStop(1, '#081123');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = 'rgba(232,199,102,.32)';
  context.lineWidth = 2;
  context.strokeRect(54, 54, 972, 1242);
  context.fillStyle = 'rgba(232,199,102,.09)';
  context.beginPath();
  context.arc(940, 130, 180, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#E8C766';
  context.font = '800 28px Manrope, sans-serif';
  context.textAlign = 'left';
  context.fillText('LDF AN-NAHL · FKH USK', 92, 118);

  const surah = SURAHS.find((item) => item.no === verse.chapter_id);
  const reference = `QS. ${surah?.name ?? `Surah ${verse.chapter_id}`} · Ayat ${verse.verse_number}`;
  context.fillStyle = '#F5EFDC';
  context.font = '600 43px "Cormorant Garamond", serif';
  context.fillText(reference, 92, 185);

  context.direction = 'rtl';
  context.textAlign = 'right';
  context.fillStyle = '#F9F4E5';
  context.font = '52px "quran-uthmani", "Noto Naskh Arabic", serif';
  const arabicLines = wrapText(context, verse.text_uthmani || verse.text_indopak, 890).slice(0, 7);
  let y = 310;
  arabicLines.forEach((line) => {
    context.fillText(line, 988, y);
    y += 90;
  });

  context.direction = 'ltr';
  context.textAlign = 'left';
  context.fillStyle = 'rgba(232,199,102,.72)';
  context.fillRect(92, Math.max(840, y + 16), 92, 3);

  context.fillStyle = '#D7DDED';
  context.font = '500 30px Manrope, sans-serif';
  const translationY = Math.max(900, y + 74);
  const translationLines = wrapText(context, verse.translation_id || 'Terjemahan belum tersedia.', 895).slice(0, 7);
  translationLines.forEach((line, index) => {
    context.fillText(line, 92, translationY + (index * 48));
  });

  context.fillStyle = '#9FA9C5';
  context.font = '600 23px Manrope, sans-serif';
  context.fillText('Baca, simpan, dan renungkan melalui rumah digital LDF An-Nahl.', 92, 1244);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Kartu ayat gagal dibuat.')), 'image/png');
  });
}

export async function shareVerseCard(verse: QuranVerse): Promise<'shared' | 'downloaded'> {
  const blob = await createVerseCardBlob(verse);
  const file = new File([blob], `ayat-${verse.chapter_id}-${verse.verse_number}.png`, { type: 'image/png' });
  const shareData = { files: [file], text: buildVerseShareText(verse), title: `Ayat ${verse.verse_key}` };
  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'shared';
  }

  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
  return 'downloaded';
}

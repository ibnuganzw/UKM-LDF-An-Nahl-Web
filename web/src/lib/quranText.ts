const ROUND_SUKUN_PATTERN = /\u0652/g;
const QURANIC_SUKUN = '\u06e1';

export function quranText(text: string): string {
  return text.replace(ROUND_SUKUN_PATTERN, QURANIC_SUKUN);
}

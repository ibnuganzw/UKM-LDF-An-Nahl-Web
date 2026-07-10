// Phonetic core for Lafzi-style Qur'an search.
//
// Faithful JavaScript port of the phonetic engine from
// https://github.com/hablullah/go-lafzi (internal/phonetic/*.go), which itself
// reproduces the Lafzi research from IPB. The idea: encode fully-vowelled
// Arabic text into a compact phonetic code, encode the (Indonesian-style) Latin
// query into the SAME space, then match on character trigrams.
//
// This module is framework-free ESM so it can be imported both by the Node
// build script (scripts/buildQuranIndex.mjs) and by the browser search worker.

// --- Arabic letter / harakat constants (Unicode) --------------------------

const HAMZA = 'ء';
const ALEF_HAMZA_ABOVE = 'أ';
const WAW_HAMZA_ABOVE = 'ؤ';
const ALEF_HAMZA_BELOW = 'إ';
const YEH_HAMZA_ABOVE = 'ئ';
const ALEF = 'ا';
const BEH = 'ب';
const TEH_MARBUTA = 'ة';
const TEH = 'ت';
const THEH = 'ث';
const JEEM = 'ج';
const HAH = 'ح';
const KHAH = 'خ';
const DAL = 'د';
const THAL = 'ذ';
const REH = 'ر';
const ZAIN = 'ز';
const SEEN = 'س';
const SHEEN = 'ش';
const SAD = 'ص';
const DAD = 'ض';
const TAH = 'ط';
const ZAH = 'ظ';
const AIN = 'ع';
const GHAIN = 'غ';
const FEH = 'ف';
const QAF = 'ق';
const KAF = 'ك';
const LAM = 'ل';
const MEEM = 'م';
const NOON = 'ن';
const HEH = 'ه';
const WAW = 'و';
const YEH = 'ي';
const FATHATAN = 'ً';
const DAMMATAN = 'ٌ';
const KASRATAN = 'ٍ';
const FATHA = 'َ';
const DAMMA = 'ُ';
const KASRA = 'ِ';
const SUKUN = 'ْ';

// Uthmani (QPC Hafs) uses a handful of code points that the base Lafzi mapping
// does not know about. Fold them onto the standard letters/marks first so the
// rest of the pipeline behaves identically to plain Arabic input.
const UTHMANI_PRENORMALIZE = new Map([
  ['ٱ', ALEF], // ٱ alef wasla
  ['ٲ', ALEF], // ٲ alef with wavy hamza above
  ['ٳ', ALEF], // ٳ alef with wavy hamza below
  ['ٵ', ALEF], // ٵ high hamza alef
  ['ٰ', ALEF], // ٰ superscript / dagger alef → long "a"
  ['ى', ALEF], // ى alef maksura
  ['ی', YEH], // ی farsi yeh
  ['ي', YEH], // keep yeh
  ['ۡ', SUKUN], // ۡ small high dotless head of khah (Uthmani sukun)
  ['۠', SUKUN], // ۠ small high upright rectangular zero
]);

function transformArabicRune(r) {
  switch (r) {
    case JEEM:
    case THAL:
    case ZAIN:
    case ZAH:
      return 'z';
    case HAH:
    case KHAH:
    case HEH:
      return 'h';
    case HAMZA:
    case ALEF:
    case AIN:
    case ALEF_HAMZA_ABOVE:
    case ALEF_HAMZA_BELOW:
    case YEH_HAMZA_ABOVE:
    case WAW_HAMZA_ABOVE:
      return 'x';
    case THEH:
    case SEEN:
    case SHEEN:
    case SAD:
      return 's';
    case DAL:
    case DAD:
      return 'd';
    case TEH_MARBUTA:
    case TEH:
    case TAH:
      return 't';
    case QAF:
    case KAF:
      return 'k';
    case GHAIN:
      return 'g';
    case FEH:
      return 'f';
    case MEEM:
      return 'm';
    case NOON:
      return 'n';
    case LAM:
      return 'l';
    case BEH:
      return 'b';
    case YEH:
      return 'y';
    case WAW:
      return 'w';
    case REH:
      return 'r';
    case FATHATAN:
      return 'an';
    case DAMMATAN:
      return 'un';
    case KASRATAN:
      return 'in';
    case FATHA:
      return 'a';
    case DAMMA:
      return 'u';
    case KASRA:
      return 'i';
    case SUKUN:
      return '0';
    default:
      return '';
  }
}

// --- Latin / phonetic string normalization --------------------------------

const ALLOWED_PHONETIC = new Set([
  'z', 'h', 'x', 's', 'd', 't', 'k', 'g',
  'f', 'm', 'n', 'l', 'b', 'y', 'w', 'r',
  'a', 'u', 'i', '0',
]);

const APOSTROPHES = new Set([
  "'", '`', '’', 'ʼ', 'ʻ', '՚', 'ꞌ',
  '′', '‵', 'ʹ', '＇', '‘', '´', 'ʿ',
]);

function mapSimilarSoundingChar(ch) {
  switch (ch) {
    case 'o':
      return 'a';
    case 'e':
      return 'i';
    case 'v':
    case 'p':
      return 'f';
    case 'q':
      return 'k';
    case 'j':
      return 'z';
    default:
      return APOSTROPHES.has(ch) ? 'x' : ch;
  }
}

function removeCombiningMarks(s) {
  return s.normalize('NFKD').replace(/\p{Mn}/gu, '').normalize('NFKC');
}

function normalizeSpaces(s) {
  const withSpaces = s.replace(/[-_]/g, ' ');
  const words = withSpaces.split(/\s+/).filter(Boolean);
  return words.map((word) => (/^[aiu]/i.test(word) ? `x${word}` : word)).join('');
}

function mergeIdenticAdjacentRunes(s) {
  let out = '';
  let prev = '';
  for (const ch of s) {
    if (ch !== prev) {
      out += ch;
    }
    prev = ch;
  }
  return out;
}

/**
 * Normalize a phonetic / Latin string using the Lafzi heuristics. Used for both
 * the Latin query and (internally) for the Arabic-derived phonetic string.
 */
export function normalizeString(input) {
  let s = removeCombiningMarks(String(input ?? ''));
  s = s.toLowerCase();

  // Similar sounding runes: p/v → f, e → i, q → k, j → z, apostrophes → x
  s = Array.from(s).map(mapSimilarSoundingChar).join('');

  // Collapse doubled letters (Latin gemination spelling, e.g. "illa", "hayyul")
  // before the rules below can be misled by the second copy. Arabic shadda
  // never produces a literal doubled letter (it folds to ''), so without this
  // early pass a query's "ll"/"yy" diverges from the Arabic-derived string:
  // the "ay"/"aw" diphthong rule only consumes one 'y'/'w' and strands the
  // other, and a doubled 'l' can be misread as alif-lam + a following sun
  // letter by the invisible-'al' rule further down.
  s = mergeIdenticAdjacentRunes(s);

  // Normalize diphthongs.
  s = s
    .replace(/sh/g, 's')
    .replace(/ts/g, 's')
    .replace(/sy/g, 's')
    .replace(/kh/g, 'h')
    .replace(/ch/g, 'h')
    .replace(/zh/g, 'z')
    .replace(/dz/g, 'z')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/gh/g, 'g')
    .replace(/ay/g, 'ai')
    .replace(/aw/g, 'au');

  // Mark possible hamzah location between two vowels at a word start.
  s = s.replace(/\ba([iu])/gi, 'ax$1');
  s = s.replace(/\bi([au])/gi, 'ix$1');
  s = s.replace(/\bu([ai])/gi, 'ux$1');

  // Collapse spaces, prefixing vowel-initial words with hamzah 'x'.
  s = normalizeSpaces(s);

  // Drop anything that is not a valid phonetic rune.
  s = Array.from(s).filter((ch) => ALLOWED_PHONETIC.has(ch)).join('');

  // Normalize alif / hamzah 'x' in the prefix, e.g. reorder consonant clusters.
  s = s.replace(/^([^aiu0])?([^aiu0])0?([^aiu0])([aiu])/i, '$1$4$2$3$4');

  // Remove invisible 'al' (alif lam syamsiah).
  s = s.replace(/x([aiu]?)l([zsdtnlr])/gi, '$1$2');

  // Remove unused alif / hamzah 'x'.
  s = s.replace(/x([^aiu0])/gi, '$1');
  if (s.startsWith('x')) {
    s = s.slice(1);
  }

  // Remove madda (a long-spelled vowel).
  s = s.replace(/ax([^aiu]|$)/gi, 'a$1');
  s = s.replace(/iy([^aiu]|$)/gi, 'i$1');
  s = s.replace(/uw([^aiu]|$)/gi, 'u$1');

  // Tajweed rules: ikhfa, iqlab, idgham.
  s = s.replace(/n0?g/gi, 'n0');
  s = s.replace(/n0?b/gi, 'm0b');
  s = s.replace(/n0?([ynmwlr])/gi, '$1');

  // Remove sukun (stop mark).
  s = s.replace(/0/g, '');

  // Merge identical adjacent runes, e.g. 'amman' → 'aman'.
  return mergeIdenticAdjacentRunes(s);
}

/**
 * Convert fully-vowelled Arabic text into its normalized phonetic string.
 */
export function fromArabic(text) {
  const raw = String(text ?? '');
  if (!raw) {
    return '';
  }

  let phonetic = '';
  for (const ch of raw) {
    const folded = UTHMANI_PRENORMALIZE.get(ch) ?? ch;
    phonetic += transformArabicRune(folded);
  }

  return normalizeString(phonetic);
}

/**
 * Remove vowels from a normalized phonetic string, leaving a consonant
 * skeleton. Used for the "ignore vowels" (looser) search mode.
 */
export function stripVowels(phonetic) {
  return mergeIdenticAdjacentRunes(String(phonetic ?? '').replace(/[aiu]/g, ''));
}

// --- Trigram tokenization -------------------------------------------------

/**
 * Split a string into n-grams (default trigrams). Returns the gram text only.
 */
export function nGrams(s, n = 3) {
  const str = String(s ?? '');
  if (n <= 0 || str.length < n) {
    return [];
  }
  const grams = [];
  for (let i = 0; i <= str.length - n; i += 1) {
    grams.push(str.slice(i, i + n));
  }
  return grams;
}

/**
 * Split a string into n-grams, keeping the start index of each gram.
 * @returns {Array<{ text: string, start: number }>}
 */
export function nGramsWithPos(s, n = 3) {
  const str = String(s ?? '');
  if (n <= 0 || str.length < n) {
    return [];
  }
  const grams = [];
  for (let i = 0; i <= str.length - n; i += 1) {
    grams.push({ text: str.slice(i, i + n), start: i });
  }
  return grams;
}

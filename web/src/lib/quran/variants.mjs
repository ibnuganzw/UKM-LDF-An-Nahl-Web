// Spelling-variant & synonym canonicalization for the Indonesian meaning search.
//
// Applied symmetrically to BOTH the query and the translation text, so it can
// only ever *add* matches (both sides fold to the same canonical form) — it
// never changes phonetic/lafaz search, which does not use this module.

import { stemWord } from './stemmer.mjs';

// Known variant spellings / synonyms → canonical form (matched on the raw
// lowercased word, before generic folding). Kept conservative to avoid merging
// genuinely different words.
const EXPLICIT = new Map([
  ['sholat', 'salat'], ['shalat', 'salat'], ['solat', 'salat'], ['sholatku', 'salat'],
  ['rizki', 'rezeki'], ['rezki', 'rezeki'], ['rejeki', 'rezeki'], ['rizqi', 'rezeki'], ['riski', 'rezeki'],
  ['syurga', 'surga'], ['sorga', 'surga'], ['jannah', 'surga'],
  ['jahannam', 'neraka'], ['jahanam', 'neraka'],
  ['syaitan', 'setan'], ['syetan', 'setan'], ['saitan', 'setan'], ['syaithan', 'setan'],
  ['qiyamat', 'kiamat'], ['qiamat', 'kiamat'], ['kiyamat', 'kiamat'],
  ['taqwa', 'takwa'], ['taqorrub', 'takwa'],
  ['zikir', 'zikir'], ['dzikir', 'zikir'],
  ['doa', 'doa'],
  ['rasul', 'rasul'], ['rosul', 'rasul'],
  ['nabi', 'nabi'], ['nabiyy', 'nabi'],
  ['kafir', 'kafir'], ['kaafir', 'kafir'],
  ['munafik', 'munafik'], ['munafiq', 'munafik'],
  ['sedekah', 'sedekah'], ['shodaqoh', 'sedekah'], ['sodaqoh', 'sedekah'], ['shadaqah', 'sedekah'],
  ['zakat', 'zakat'], ['zakah', 'zakat'],
  ['puasa', 'puasa'], ['shaum', 'puasa'], ['shiyam', 'puasa'], ['siyam', 'puasa'],
  ['haji', 'haji'], ['hajj', 'haji'],
  ['riba', 'riba'], ['ribaa', 'riba'],
  ['alquran', 'quran'], ['koran', 'quran'],
  ['muhamad', 'muhammad'], ['mohammad', 'muhammad'], ['mohamad', 'muhammad'],
  ['mesjid', 'masjid'],
  ['wudhu', 'wudu'], ['wudlu', 'wudu'],
  ['zinah', 'zina'],
]);

// Generic, conservative spelling folds for unlisted variants. Symmetric, so
// safe: query and translation always fold identically.
function genericFold(word) {
  return word
    .replace(/['`’ʼ]/g, '')
    .replace(/sy|sh|ts/g, 's')
    .replace(/dz|zh/g, 'z')
    .replace(/dh/g, 'd')
    .replace(/kh/g, 'h')
    .replace(/q/g, 'k')
    .replace(/([bcdfghjklmnpqrstvwxyz])\1/g, '$1')
    .replace(/aa/g, 'a')
    .replace(/ii/g, 'i')
    .replace(/uu/g, 'u')
    .replace(/oo/g, 'o')
    .replace(/ee/g, 'e');
}

/**
 * Reduce an Indonesian word to a canonical, spelling-normalized root form.
 */
export function canonicalId(word) {
  let w = String(word ?? '').toLowerCase();
  w = EXPLICIT.get(w) ?? w;
  w = genericFold(w);
  w = stemWord(w);
  w = EXPLICIT.get(w) ?? w;
  return w;
}

// Accuracy harness for the Qur'an search engine. Runs known queries against the
// full prebuilt corpus and checks the expected verse ranks #1. Run without a
// browser: node scripts/testQuranSearch.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine, runSearch } from '../src/lib/quran/searchEngine.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.resolve(SCRIPT_DIR, '..', 'public', 'assets', 'quran-index', 'corpus.json');

// [query, mode, respectVowels, expectedVerseKeyAtRank1]
// respectVowels=false is the app default (combined vowel + consonant-skeleton).
const CASES = [
  ['bismillahirrahmanirrahim', 'lafaz', false, '1:1'],
  ['alhamdulillahi rabbil alamin', 'lafaz', false, '1:2'],
  // "arrahmanirrahim" is also a substring of the basmalah (1:1); the strict
  // vowel mode disambiguates it to 1:3.
  ['arrahmanirrahim', 'lafaz', true, '1:3'],
  ['maliki yaumiddin', 'lafaz', false, '1:4'],
  ['iyyaka nabudu wa iyyaka nastain', 'lafaz', false, '1:5'],
  ['ihdinassiratal mustaqim', 'lafaz', false, '1:6'],
  ['waladdollin', 'lafaz', false, '1:7'],
  // Typos / loose transliteration
  ['bismilah', 'lafaz', false, '1:1'],
  ['alhamdulilah', 'lafaz', false, '1:2'],
  ['ihdinassirotol mustaqim', 'lafaz', false, '1:6'],
  ['waladhdhoolliin', 'lafaz', false, '1:7'],
  // Other well-known verses
  ['qul huwallahu ahad', 'lafaz', false, '112:1'],
  ['qul auzu birabbinnas', 'lafaz', false, '114:1'],
  ['inna a taina kal kautsar', 'lafaz', false, '108:1'],
  ['allahu la ilaha illa huwal hayyul qayyum', 'lafaz', false, '2:255'],
  ['lam yalid walam yulad', 'lafaz', false, '112:3'],
  ['tabbat yada abi lahab', 'lafaz', false, '111:1'],
  ['qul ya ayyuhal kafirun', 'lafaz', false, '109:1'],
  ['alam nasyrah laka sodrok', 'lafaz', false, '94:1'],
  // Meaning / translation
  ['jalan yang lurus', 'translation', false, '1:6'],
  ['maha pemurah lagi maha penyayang', 'translation', false, '1:1'],
  ['orang orang yang beriman', 'translation', false, null],
  // Spelling variants / synonyms (should still return relevant verses)
  ['dirikanlah sholat', 'translation', false, null],
  ['mendirikan solat', 'translation', false, null],
  ['penghuni syurga', 'translation', false, null],
  ['orang munafiq', 'translation', false, null],
];

function run() {
  const corpus = JSON.parse(readFileSync(CORPUS_PATH, 'utf8'));
  const t0 = Date.now();
  const engine = createEngine(corpus.verses);
  const buildMs = Date.now() - t0;

  let passed = 0;
  const failures = [];

  for (const [query, mode, respectVowels, expected] of CASES) {
    const results = runSearch(engine, { query, mode, respectVowels, limit: 5 });
    const top = results[0];
    const rank = results.findIndex((r) => r.verse_key === expected) + 1;
    // expected === null means "just return at least one relevant result".
    const ok = expected === null ? Boolean(top) : Boolean(top) && top.verse_key === expected;
    if (ok) {
      passed += 1;
    } else {
      failures.push({ query, mode, expected, got: top ? top.verse_key : '(none)', rank: rank || '-', topScore: top ? top.score : '-' });
    }
    const flag = ok ? 'PASS' : 'FAIL';
    console.log(`[${flag}] ${mode.padEnd(11)} "${query}" -> #1 ${top ? top.verse_key : '(none)'} (${top ? top.score : '-'})  [expect ${expected}, rank ${rank || 'not found'}]`);
  }

  console.log('');
  console.log(`Index built in ${buildMs} ms over ${corpus.totalVerses} ayat.`);
  console.log(`${passed}/${CASES.length} passed.`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

run();

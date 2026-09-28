import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ts from '../../web/node_modules/typescript/lib/typescript.js';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

function readArray(file, variableName) {
  const path = resolve(root, file);
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === variableName) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!declaration?.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
    throw new Error(`Array ${variableName} not found in ${file}`);
  }
  function value(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(value);
    if (ts.isObjectLiteralExpression(node)) {
      return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map((property) => [
        property.name.getText(source).replace(/^['"]|['"]$/g, ''), value(property.initializer),
      ]));
    }
    return node.getText(source);
  }
  return declaration.initializer.elements.map((node) => ({
    ...value(node),
    _line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
  }));
}

const infos = readArray('web/src/data/surahInfo.ts', 'SURAH_INFO');
const surahs = readArray('web/src/data/surahs.ts', 'SURAHS_RAW');
const sourceSha256 = createHash('sha256').update(readFileSync(resolve(root, 'web/src/data/surahInfo.ts'))).digest('hex');
const byNo = new Map(surahs.map((surah) => [surah.no, surah]));
const narrativeKeys = [
  'temaUtama', 'konteksTurun', 'asbabunNuzul', 'alasanPenamaan', 'keutamaan',
  'faktaMenarik', 'munasabah', 'pesanPraktis', 'pertanyaanTadabbur',
  'catatanIkhtilaf', 'ringkasanSingkat',
];
const allTextKeys = [...narrativeKeys, 'gambaranIsi', 'strukturSurat', 'pokokKandungan', 'ayatKunci'];
const rules = {
  clinical: /\b(?:anti[ -]?depresan|depresi|vaksin|imunisasi|radiasi|terapi|klinis|medis|sembuh total|memory cell|penyakit fisik|penyakit mematikan|virus malaria|sindrom|hormon|genetik)\b/giu,
  sciTech: /\b(?:di-hack|di-ACC|bodyguard|sniper|good governance|masterclass|deterrence|live|software|hardware|algoritma|pemrograman|forensik|frekuensi|biologis|embriologi|anatomi sel|astronomi|kosmik|sains)\b/giu,
  absolute: /\b(?:absolut|mutlak|pasti|jaminan|garansi|paripurna|pamungkas|100%|semua|seluruh)\b/giu,
  groupMention: /\b(?:Yahudi|Nasrani|Kristen|orientalis)\b/giu,
};

function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}
function wordCount(value) {
  return (value.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []).length;
}
function ranges(item) {
  const segments = item.split(/\s*(?:&|,|dan)\s*/i);
  return segments.map((segment) => {
    const match = /^(?:Ayat\s*)?(\d+)(?:\s*[-–]\s*(\d+))?$/i.exec(segment);
    return match ? [Number(match[1]), Number(match[2] ?? match[1])] : null;
  });
}
function csv(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

const rows = infos.map((info) => {
  const surah = byNo.get(info.no);
  const chapter = JSON.parse(readFileSync(resolve(root, `web/public/assets/quran-data/chapters/${info.no}.json`), 'utf8'));
  const juzList = chapter.verses.map((verse) => verse.juz_number).filter(Number.isInteger);
  const chapterJuz = [Math.min(...juzList), Math.max(...juzList)];
  const allText = allTextKeys.flatMap((key) => strings(info[key])).join(' ');
  const narrative = narrativeKeys.map((key) => info[key]).join(' ');
  const wordCounts = Object.fromEntries(narrativeKeys.map((key) => [key, wordCount(info[key])]));
  const emptyFields = [...narrativeKeys, 'namaLain', 'gambaranIsi', 'strukturSurat', 'pokokKandungan', 'ayatKunci', 'sumberRujukan']
    .filter((key) => info[key] == null || info[key].length === 0);
  const requiredEmptyFields = emptyFields.filter((key) => !['namaLain', 'asbabunNuzul'].includes(key));
  const flags = {};
  for (const [key, regex] of Object.entries(rules)) {
    flags[key] = [...new Set((allText.match(regex) || []).map((term) => term.toLowerCase()))];
  }
  // Digits immediately after prose and before punctuation often indicate pasted footnote markers.
  const footnoteCandidates = [];
  for (const key of narrativeKeys) {
    const text = info[key];
    for (const match of text.matchAll(/(.{0,35}?)\s(\d{1,2})(?=[,.;])/gu)) {
      const prefix = match[1];
      if (/\b(?:ayat|juz|surat|tahun|hari|jam|halaman|hr\.?|nomor|bab)\s*$/iu.test(prefix)) continue;
      footnoteCandidates.push({ field: key, token: match[2], snippet: text.slice(Math.max(0, match.index - 38), Math.min(text.length, match.index + match[0].length + 35)) });
    }
  }
  const oddQuotes = narrativeKeys.filter((key) => (info[key].match(/"/g) || []).length % 2 !== 0);
  const rangeIssues = [];
  const mapCoverage = {};
  for (const [field, items, key] of [
    ['gambaranIsi', info.gambaranIsi, 'rentang'],
    ['strukturSurat', info.strukturSurat, 'rentang'],
  ]) {
    const counts = new Map();
    for (const item of items) {
      for (const parsed of ranges(item[key])) {
        if (!parsed) rangeIssues.push(`${field}: format "${item[key]}" perlu cek manual`);
        else if (parsed[0] < 1 || parsed[1] < parsed[0] || parsed[1] > surah.ayat) {
          rangeIssues.push(`${field}: "${item[key]}" di luar 1-${surah.ayat}`);
        } else {
          for (let n = parsed[0]; n <= parsed[1]; n += 1) counts.set(n, (counts.get(n) ?? 0) + 1);
        }
      }
    }
    mapCoverage[field] = {
      gaps: Array.from({ length: surah.ayat }, (_, index) => index + 1).filter((n) => !counts.has(n)),
      overlaps: [...counts.entries()].filter(([, count]) => count > 1).map(([n]) => n),
    };
  }
  for (const item of info.ayatKunci) {
    for (const parsed of ranges(item.ayat.replace(/\s*\([^)]*\)\s*/g, ''))) {
      if (!parsed) rangeIssues.push(`ayatKunci: format "${item.ayat}" perlu cek manual`);
      else if (parsed[0] < 1 || parsed[1] < parsed[0] || parsed[1] > surah.ayat) {
        rangeIssues.push(`ayatKunci: "${item.ayat}" di luar 1-${surah.ayat}`);
      }
    }
  }
  const preciseSources = info.sumberRujukan.filter((source) => /https?:|\b(?:hal\.?|hlm\.?|jilid|ayat\s+\d|\d+:\d+)\b/i.test(source));
  const findings = [];
  if (!surah) findings.push('Nomor surah tidak ditemukan di metadata lokal');
  if (surah?.ayat !== chapter.verses.length) findings.push(`Jumlah ayat metadata ${surah?.ayat} berbeda dari paket ${chapter.verses.length}`);
  if (info.urutanTurun < 1 || info.urutanTurun > 114) findings.push(`Urutan turun ${info.urutanTurun} di luar 1-114`);
  if (requiredEmptyFields.length) findings.push(`field utama kosong: ${requiredEmptyFields.join(', ')}`);
  if (info.juz.dari !== chapterJuz[0] || info.juz.sampai !== chapterJuz[1]) findings.push(`Juz ${info.juz.dari}-${info.juz.sampai} berbeda dari paket ayat ${chapterJuz.join('-')}`);
  if (rangeIssues.length) findings.push(`${rangeIssues.length} rentang/rujukan ayat perlu cek`);
  if (mapCoverage.gambaranIsi.gaps.length) findings.push(`peta ayat memiliki ${mapCoverage.gambaranIsi.gaps.length} ayat tanpa cakupan`);
  if (mapCoverage.strukturSurat.gaps.length) findings.push(`struktur surat memiliki ${mapCoverage.strukturSurat.gaps.length} ayat tanpa cakupan`);
  if (footnoteCandidates.length) findings.push(`${footnoteCandidates.length} calon sisa penanda catatan`);
  if (oddQuotes.length) findings.push(`tanda kutip ganjil: ${oddQuotes.join(', ')}`);
  if (flags.clinical.length) findings.push('klaim/analogi kesehatan perlu tinjauan');
  if (flags.sciTech.length) findings.push('analogi sains/teknologi perlu tinjauan');
  if (flags.groupMention.length) findings.push('sebutan kelompok agama perlu cek konteks');
  return {
    no: info.no, name: surah?.name ?? '?', line: info._line,
    ayat: surah?.ayat, chapterVerses: chapter.verses.length, juz: `${info.juz.dari}-${info.juz.sampai}`, chapterJuz: chapterJuz.join('-'),
    urutanTurun: info.urutanTurun, reviewStatus: info.reviewStatus ?? 'absent', tier: info.tier,
    totalWords: wordCount(allText), summaryWords: wordCounts.ringkasanSingkat,
    longestNarrativeWords: Math.max(...Object.values(wordCounts)),
    referenceCount: info.sumberRujukan.length, preciseReferenceCount: preciseSources.length,
    emptyFields, requiredEmptyFields, rangeIssues, mapCoverage, footnoteCandidates, oddQuotes, flags, findings,
    summary: info.ringkasanSingkat,
  };
});

const numbers = rows.map((r) => r.no);
const chronology = rows.map((r) => r.urutanTurun);
const coverage = {
  count: rows.length,
  missingNumbers: Array.from({ length: 114 }, (_, index) => index + 1).filter((n) => !numbers.includes(n)),
  duplicateNumbers: numbers.filter((n, index) => numbers.indexOf(n) !== index),
  missingChronology: Array.from({ length: 114 }, (_, index) => index + 1).filter((n) => !chronology.includes(n)),
  duplicateChronology: chronology.filter((n, index) => chronology.indexOf(n) !== index),
};
const summary = {
  sourceSha256,
  coverage,
  reviewStatusAbsent: rows.filter((r) => r.reviewStatus === 'absent').length,
  emptyFieldsEntries: rows.filter((r) => r.emptyFields.length).length,
  requiredEmptyFieldsEntries: rows.filter((r) => r.requiredEmptyFields.length).length,
  genericSourcesOnly: rows.filter((r) => r.preciseReferenceCount === 0).length,
  juzMismatch: rows.filter((r) => r.juz !== r.chapterJuz).length,
  chapterVerseMismatch: rows.filter((r) => r.ayat !== r.chapterVerses).length,
  rangeIssues: rows.reduce((sum, r) => sum + r.rangeIssues.length, 0),
  rangeEntries: rows.filter((r) => r.rangeIssues.length).length,
  overviewGapsEntries: rows.filter((r) => r.mapCoverage.gambaranIsi.gaps.length).length,
  structureGapsEntries: rows.filter((r) => r.mapCoverage.strukturSurat.gaps.length).length,
  footnoteCandidates: rows.reduce((sum, r) => sum + r.footnoteCandidates.length, 0),
  footnoteEntries: rows.filter((r) => r.footnoteCandidates.length).length,
  clinicalEntries: rows.filter((r) => r.flags.clinical.length).length,
  sciTechEntries: rows.filter((r) => r.flags.sciTech.length).length,
  groupMentionEntries: rows.filter((r) => r.flags.groupMention.length).length,
  totalWords: rows.reduce((sum, r) => sum + r.totalWords, 0),
};
writeFileSync(resolve(here, 'scan.json'), `${JSON.stringify({ summary, rows }, null, 2)}\n`);
const headers = ['no', 'name', 'line', 'ayat', 'juz', 'chapterJuz', 'reviewStatus', 'totalWords', 'summaryWords', 'referenceCount', 'preciseReferenceCount', 'rangeIssues', 'footnoteCandidates', 'clinical', 'sciTech', 'groupMention', 'findings', 'summary'];
writeFileSync(resolve(here, 'scan.csv'), [headers.map(csv).join(','), ...rows.map((r) => [
  r.no, r.name, r.line, r.ayat, r.juz, r.chapterJuz, r.reviewStatus,
  r.totalWords, r.summaryWords, r.referenceCount, r.preciseReferenceCount,
  r.rangeIssues.length, r.footnoteCandidates.length, r.flags.clinical.join('; '),
  r.flags.sciTech.join('; '), r.flags.groupMention.join('; '), r.findings.join('; '), r.summary,
].map(csv).join(','))].join('\n') + '\n');
const index = [
  '# Indeks audit 114 catatan surah',
  '',
  'Dihasilkan dari `scan.mjs` untuk triase. Kode adalah pemicu pemeriksaan, bukan vonis kesalahan isi.',
  '',
  '- **A**: calon angka/penanda yang tertinggal di prosa; daftar dapat berisi positif palsu.',
  '- **K**: kosakata kesehatan/klinis; cek apakah berupa analogi, klaim medis, atau kutipan.',
  '- **T**: kosakata sains/teknologi; cek ketepatan analogi dan sumber.',
  '- **G**: penyebutan kelompok agama; cek konteks dan hindari generalisasi.',
  '- **S**: peta struktur tidak mencakup semua ayat; dapat disengaja, tetapi label UI harus jelas.',
  '- **U**: nomor urutan turun berulang; perlu memilih acuan kronologi sebelum memperbaiki.',
  '- **—**: tidak ada pemicu di atas. Semua 114 masih memerlukan rujukan per klaim dan tinjauan manusia.',
  '',
  '| No. | Surah | Baris sumber | Kata seluruh entri | Kata ringkasan | Pemicu |',
  '| ---: | --- | ---: | ---: | ---: | --- |',
  ...rows.map((r) => {
    const codes = [
      r.footnoteCandidates.length ? 'A' : '',
      r.flags.clinical.length ? 'K' : '',
      r.flags.sciTech.length ? 'T' : '',
      r.flags.groupMention.length ? 'G' : '',
      r.mapCoverage.strukturSurat.gaps.length ? 'S' : '',
      r.urutanTurun === 56 ? 'U' : '',
    ].filter(Boolean).join(' ') || '—';
    return `| ${r.no} | ${r.name.replaceAll('|', '\\|')} | ${r.line} | ${r.totalWords} | ${r.summaryWords} | ${codes} |`;
  }),
  '',
  'Semua 114 memiliki `reviewStatus` kosong dan daftar `sumberRujukan` tanpa rujukan spesifik per klaim.',
  '',
].join('\n');
writeFileSync(resolve(here, 'INDEX-114.md'), index);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

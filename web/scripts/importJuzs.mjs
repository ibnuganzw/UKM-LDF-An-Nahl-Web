import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');

async function importJuzs() {
  console.log('Fetching Juz data from quran.com...');
  const response = await fetch('https://api.quran.com/api/v4/juzs');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch juzs: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const juzs = payload.juzs;

  if (!Array.isArray(juzs)) {
    throw new Error('Invalid response format: expected juzs array');
  }

  // Remove the 'id' field as it is redundant (same as juz_number in most cases)
  // Ensure uniqueness by juz_number
  const uniqueJuzs = new Map();
  for (const juz of juzs) {
    if (!uniqueJuzs.has(juz.juz_number)) {
      uniqueJuzs.set(juz.juz_number, {
        juz_number: juz.juz_number,
        verse_mapping: juz.verse_mapping,
        first_verse_id: juz.first_verse_id,
        last_verse_id: juz.last_verse_id,
        verses_count: juz.verses_count
      });
    }
  }
  
  const cleanedJuzs = Array.from(uniqueJuzs.values());
  cleanedJuzs.sort((a, b) => a.juz_number - b.juz_number);

  const fileContent = `import type { Juz } from '../types';

export const JUZS: Juz[] = ${JSON.stringify(cleanedJuzs, null, 2)};
`;

  const outputPath = path.join(DATA_DIR, 'juzs.ts');
  await fs.writeFile(outputPath, fileContent, 'utf-8');
  console.log(`Successfully wrote ${cleanedJuzs.length} juzs to ${outputPath}`);
}

importJuzs().catch(console.error);

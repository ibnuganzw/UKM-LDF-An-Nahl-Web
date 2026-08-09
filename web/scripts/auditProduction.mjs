import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowlist = JSON.parse(readFileSync(join(root, 'security', 'audit-allowlist.json'), 'utf8'));
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('npm_execpath tidak tersedia; jalankan melalui npm run audit:security.');
  process.exit(1);
}

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

const forbiddenRscPatterns = ['react-server-dom', 'react-router/dom-rsc', 'react-router/rsc'];
const rscUsage = sourceFiles(join(root, 'src'))
  .filter((path) => /\.(?:ts|tsx|js|jsx)$/.test(path))
  .find((path) => forbiddenRscPatterns.some((pattern) => readFileSync(path, 'utf8').includes(pattern)));
if (rscUsage) {
  console.error(`Pengecualian advisory RSC tidak valid karena pola RSC ditemukan di ${rscUsage}.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [npmCli, 'audit', '--json'], {
  cwd: root,
  encoding: 'utf8',
});
let report;
try {
  report = JSON.parse(result.stdout || result.stderr);
} catch {
  console.error(result.stderr || 'Output npm audit tidak dapat dibaca.');
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};

function advisoryIdsFor(packageName, seen = new Set()) {
  if (seen.has(packageName)) return [];
  seen.add(packageName);
  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return [];
  return vulnerability.via.flatMap((via) => {
    if (typeof via === 'string') return advisoryIdsFor(via, seen);
    const match = typeof via.url === 'string' ? via.url.match(/GHSA-[\w-]+$/) : null;
    return match ? [match[0]] : [];
  });
}

const today = new Date().toISOString().slice(0, 10);
const unapproved = [];
for (const packageName of Object.keys(vulnerabilities)) {
  const ids = [...new Set(advisoryIdsFor(packageName))];
  if (ids.length === 0) {
    unapproved.push(`${packageName}: advisory tidak dapat diidentifikasi`);
    continue;
  }
  for (const id of ids) {
    const approval = allowlist.advisories[id];
    if (!approval || !approval.packages.includes(packageName) || approval.expires < today) {
      unapproved.push(`${packageName}: ${id}`);
    }
  }
}

if (unapproved.length > 0) {
  console.error(`Advisory produksi belum disetujui:\n- ${unapproved.join('\n- ')}`);
  process.exit(1);
}

const approvedIds = [...new Set(Object.keys(vulnerabilities).flatMap((name) => advisoryIdsFor(name)))];
if (approvedIds.length > 0) {
  console.log(`Audit dependensi lolos dengan pengecualian terbatas: ${approvedIds.join(', ')}.`);
} else {
  console.log('Audit dependensi bersih: tidak ada advisory yang terdeteksi.');
}

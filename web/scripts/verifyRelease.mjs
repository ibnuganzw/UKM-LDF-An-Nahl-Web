import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

// Offline artifact check. Does not load .env, contact Supabase, or deploy.
const PROJECTS = {
  staging: 'qclesvwptdvvlmxxfnsj',
  production: 'rdbjmmgzmfyrphxiimcf',
};
const STAGING_HOST = 'ldf-annahl-fkh-usk-staging.pages.dev';
const FIXTURES = ['5ca48413-2ddf-4708-96bd-8669b2ceb768', '32e2bd52-4000-4438-bc10-3ef1c76b04db'];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const { values } = parseArgs({ options: {
    target: { type: 'string' },
    site: { type: 'string' },
    dir: { type: 'string', default: 'dist' },
  } });
  requireCondition(Object.hasOwn(PROJECTS, values.target ?? ''), 'Specify --target staging or --target production.');
  requireCondition(values.site, 'Specify the exact HTTPS origin with --site.');
  const site = new URL(values.site);
  requireCondition(site.protocol === 'https:' && site.pathname === '/' && !site.search && !site.hash
    && !site.username && !site.password && !site.port, '--site must be a bare HTTPS origin.');
  const stagingHost = site.hostname === STAGING_HOST || site.hostname.endsWith(`.${STAGING_HOST}`);
  requireCondition(values.target === 'staging' ? stagingHost : !stagingHost, 'Site hostname conflicts with the selected target.');

  const directory = path.resolve(values.dir);
  const [html, sitemap, robots, manifestText, assetNames] = await Promise.all([
    readFile(path.join(directory, 'index.html'), 'utf8'),
    readFile(path.join(directory, 'sitemap.xml'), 'utf8'),
    readFile(path.join(directory, 'robots.txt'), 'utf8'),
    readFile(path.join(directory, 'prerender-manifest.json'), 'utf8'),
    readdir(path.join(directory, 'assets')),
  ]);
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  requireCondition(canonical === `${site.origin}/`, 'Root canonical URL does not match --site.');
  const manifest = JSON.parse(manifestText);
  requireCondition(manifest.siteUrl === site.origin, 'Prerender manifest uses a different origin.');
  requireCondition(Array.isArray(manifest.routes) && manifest.routes.length >= 150
    && manifest.routeCount === manifest.routes.length, 'Prerender manifest is incomplete.');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  requireCondition(locations.length === manifest.routeCount
    && locations.every((location) => new URL(location).origin === site.origin), 'Sitemap count or origin does not match the manifest.');
  requireCondition(FIXTURES.every((id) => !sitemap.includes(id) && !manifestText.includes(id)), 'An internal agenda fixture appears in discovery output.');
  requireCondition(robots.split(/\r?\n/).includes(`Sitemap: ${site.origin}/sitemap.xml`), 'robots.txt points to a different sitemap.');

  const scripts = await Promise.all(assetNames.filter((name) => name.endsWith('.js'))
    .map((name) => readFile(path.join(directory, 'assets', name), 'utf8')));
  const endpoints = new Set(scripts.flatMap((script) => [...script.matchAll(/https:\/\/([a-z]{20})\.supabase\.co\b/g)]
    .map((match) => match[1])));
  const expectedRef = PROJECTS[values.target];
  requireCondition(endpoints.size === 1 && endpoints.has(expectedRef), 'Bundled Supabase endpoint does not match the selected target.');
  // Legacy anon keys are public, but their role/project must still be correct.
  // Never print key values, including when a check fails.
  let anonKeys = 0;
  for (const script of scripts) {
    for (const match of script.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
      const claims = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      requireCondition(claims.role === 'anon' && claims.ref === expectedRef, 'A bundled JWT has an unexpected role or project.');
      anonKeys += 1;
    }
  }
  requireCondition(anonKeys > 0, 'Expected public anon key was not found; review any key-format migration before release.');
  const entry = html.match(/src="(\/assets\/index-[A-Za-z0-9_-]+\.js)"/)?.[1];
  requireCondition(entry, 'Main entry bundle was not found.');
  const entryBytes = await readFile(path.join(directory, entry.slice(1)));
  console.log(JSON.stringify({
    target: values.target,
    site: site.origin,
    supabaseProject: expectedRef,
    routes: manifest.routeCount,
    entry,
    sha256: createHash('sha256').update(entryBytes).digest('hex'),
    checks: 'passed (offline artifact only; hosted configuration and runtime are separate)',
  }, null, 2));
}

main().catch((error) => {
  console.error(`[release:verify] ${error.message}`);
  process.exitCode = 1;
});

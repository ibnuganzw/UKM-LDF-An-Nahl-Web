# LDF An-Nahl — Website

Production web app for LDF An-Nahl FKH USK, built with Vite, React, TypeScript, React Router, CSS Modules, and Supabase.

## Getting started

```bash
npm install
npm run dev      # local development server
npm run test     # publication and editorial regression tests
npm run build    # typecheck + production build
npm run check    # lint + tests + build + production dependency audit
npm run preview  # preview the production build
```

## Structure

- `src/pages/` — public, member, and admin routes.
- `src/components/ui/` — shared design-system primitives.
- `src/components/layout/` — responsive site shell.
- `src/state/AppContext.tsx` — Supabase Auth session and member profile state.
- `src/data/` — static Qur'an metadata and editorial reference data.
- `src/lib/` — date, prayer-time, security, publication, and formatting helpers.
- `supabase/` — database migrations and Edge Functions.

## Runtime data and release guardrails

- Auth, profiles, agenda, registration, attendance, articles, and organisation structure use Supabase with role/RLS checks.
- Prayer times are fetched by city and date. A same-city, same-date cache may be shown offline; the app never presents a static estimated table as authoritative.
- Qur'an reading data is bundled in `public/assets/quran-data/`. Encyclopedic surah notes carry a visible editorial-review status until human review is recorded.
- Known internal agenda fixtures are withheld from public routes but remain visible to admins for source-level cleanup.
- Registration and password reset enforce at least ten characters containing letters and digits. The hosted Supabase Auth policy must match `supabase/config.toml` before this branch is released.
- Apply `supabase/migrations/20260809160000_phase11_auth_rate_limits.sql` before deploying the NIM login/reset Edge Functions from this branch; the functions deliberately fail closed when the limiter is unavailable.
- `.github/workflows/app-quality.yml` runs the complete quality gate for changes under `web/`.
- `.github/workflows/supabase-keepalive.yml` performs a minimal scheduled public database read and requires repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Article editorial CMS

- Apply `supabase/migrations/20260802090000_phase9_article_editorial_trust.sql` before using the new review metadata in production.
- Apply `supabase/migrations/20260803110000_phase10_admin_audit_log.sql` to activate the immutable admin activity log. The audit screen reports a clear pending-migration state until it is applied.
- The admin editor detects whether that migration is available. Core drafts remain editable on the legacy schema, while Islam Veteriner publication stays blocked until its scientific and sharia review is complete.
- Word imports show their title, cover-image, warning, and semantic-section mapping before the article is saved.
- Supported semantic sections are Dalil Al-Qur'an, Hadis, Khilaf & Fikih, Bukti Ilmiah, Catatan Keselamatan, Kesimpulan, and Referensi.
- Public reads fall back to the legacy column set while the migration is pending, so applying the frontend before the database migration does not blank the article index.

### Quran offline and installable app

- Production builds register `public/sw.js` and expose `public/manifest.webmanifest`; development mode deliberately does not register a service worker.
- The Quran hub offers an explicit offline pack instead of silently spending data. It stores all 114 chapter files, all supplements, the search corpus, and Quran fonts (roughly 10 MB) in the current browser profile.
- Murottal audio remains streamed and is not included in the offline pack. Users can remove the Quran cache from the same card at any time.

## Discovery and public metadata

- Set `VITE_SITE_URL` to the final HTTPS origin in the production build environment. Cloudflare preview builds can fall back to `CF_PAGES_URL`; local artifacts deliberately use `http://127.0.0.1:5174` when neither value exists.
- `npm run build` generates route-specific HTML, canonical URLs, Open Graph/Twitter metadata, JSON-LD, `sitemap.xml`, `robots.txt`, and `prerender-manifest.json`.
- The guaranteed build covers the six main public routes, all 114 surahs, and all 30 juz. Published article and agenda detail routes are added when the Supabase variables are available through `.env` locally or the build environment in CI/Cloudflare.
- Runtime navigation updates the same metadata for client-side route changes. Unknown, unresolved-detail, authentication, member, scan, and admin routes remain `noindex`.
- Rebuild and redeploy after publishing or removing an article or agenda so its static detail page and sitemap entry match the public database.

## Qur'an data maintenance

```bash
npm run quran:sync
npm run quran:index
npm run quran:data
```

Review generated data and run `npm run check` before release.

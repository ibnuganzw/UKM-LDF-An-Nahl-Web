# Handoff: LDF An-Nahl Website Prototype ("Dark Luxe" redesign)

## Overview
A prototype website for **LDF An-Nahl** — the Lembaga Dakwah Fakultas (student da'wah body) of the Faculty of Veterinary Medicine, Universitas Syiah Kuala (FKH USK). It combines an organizational profile site with a lightweight member portal: browsing agenda/events, reading Qur'an + articles, checking prayer times, and a mocked QR-code attendance system for events (member scans, admin generates).

Brand identity is built around the **An-Nahl (bee / Surah 16)** theme — "orderly colony, purposeful, beneficial" — expressed through a gold honeycomb-hexagon motif, warm gold-on-deep-navy "dark luxe" palette, and serif display type.

## About the Design Files
The files in this bundle are **design references built as an HTML/React-like prototype** — they demonstrate exact look, copy, states, and interaction behavior, but are **not production code to copy directly**. The prototype:
- Uses in-browser JSX transpilation and a custom runtime (`support.js`) purely so the prototype can be edited/previewed live. Production must NOT use this runtime — implement in the target codebase's real framework/build (React + Vite/Next.js, or whatever stack the team already uses) with a normal compile step.
- Fakes all backend behavior with `localStorage` and in-memory seed data (see "Data Requirements for Production" below). None of it is connected to a real database, auth system, or external API.
- Your task is to **recreate this design and its interaction behavior** in the real codebase/environment, using its existing libraries, routing, and patterns — not to embed this HTML as-is.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, iconography, and micro-interactions (hover states, animations, QR flow, countdown) are all final/intentional and should be reproduced precisely. The only intentionally-fake parts are explicitly labeled below (mock auth, dummy QR, placeholder org data, placeholder prayer times, partial Qur'an text) — those need real data sources/backends, not just visual polish.

---

## Design Language & Shared Components
These patterns repeat across nearly every screen — implement them as shared components/tokens rather than one-offs.

**Signature motif — the hexagon.** Every icon frame, list bullet, divider ornament, and the QR module uses one hexagon shape:
`clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)`. Usually gold-filled or gold-tinted, sometimes just a thin cluster of 3 as a section divider. This is the single most important brand signature — treat it as a reusable `<HexIcon>`/`<HexBullet>` component (accepts fill color, size, and inner glyph/initial/number).

**Glass card** (default surface for nearly all content blocks):
- `background: rgba(255,255,255,.045)`; `backdrop-filter: blur(18–20px)`
- `border: 1px solid rgba(232,199,102, .14–.20)` (gold at low alpha); emphasized cards use `.26–.35` alpha border, or a `linear-gradient(150deg, rgba(201,162,39,.14–.18), rgba(255,255,255,.03))` fill for "featured" cards
- `border-radius: 20–26px` (30px for hero-style panels, 28px for auth cards)
- `box-shadow: inset 0 1px 0 rgba(255,255,255,.05–.07)` (top glass highlight) — hover states add an outer glow shadow and lift `translateY(-2px to -5px)`, border brightens to `rgba(232,199,102,.5)`

**Buttons**
- Primary (pill): `background: linear-gradient(135deg,#E8C766,#C9A227)`, text `#241B04`, `font-weight:800`, `border-radius:999px`, `box-shadow:0 14-16px 32-40px -12px rgba(201,162,39,.55-.6)`; hover deepens shadow + lifts 1–2px.
- Secondary/outline: `border:1px solid rgba(245,239,220,.25-.3)`, `background:rgba(255,255,255,.04)`, text `#F5EFDC`; hover brightens border to gold.
- Destructive (logout, deactivate QR, etc.): text `#E58A8A`, transparent bg, `border:1px solid rgba(229,138,138,.3-.35)`; hover fills `rgba(229,138,138,.08)`.
- Success (scan/absen action): `linear-gradient(135deg,#5CCBA0,#2E9C77)` on `#06281C` text.
- Minimum tap target 44px height throughout (mobile-friendly).

**Badges / chips / filter pills**: `border-radius:999px`, `font-weight:800`, small uppercase label (`10–12px`, `letter-spacing:.06-.16em`) using a "color on 1F-alpha-of-itself background" pattern (e.g. text `#8FAAF5` on `#8FAAF515`-ish background) — status/type-driven color, see palette table.

**Section header pattern** (used at the top of nearly every content section): a tiny eyebrow label (11px, weight 800, letter-spacing .26em, uppercase, gold `#C9A227`) directly above a large serif `<h1>/<h2>` in Cormorant Garamond.

**Dividers**: either a plain gradient hairline fading to transparent, or the "honeycomb cluster" (3 small hexagons, center one larger) flanked by fading hairlines.

**Decorative background layer** on the hero and the "Quran band": a very low-opacity (4–5%) repeating honeycomb line-art SVG pattern, plus 1–2 large blurred radial-gradient "glow blobs" (gold + purple) that slowly pulse (`breath` animation, 7–9s ease-in-out). The hero also has a simple flat silhouette of a mosque dome + minarets drawn from stacked divs along the bottom edge, and 3 small animated "bee" sprites (tiny gradient-striped ellipses with a slow wandering flight path, `beeF` keyframe, 11–18s loops).

---

## Screens / Views

### 1. Global Header
- Sticky, `rgba(8,14,34,.82)` background + blur, bottom hairline border.
- Left: 42px circular logo (gold ring glow) + "LDF An-Nahl" (bold) / "FKH USK" (tiny gold uppercase tracking) — click navigates home.
- Center (≥920px only): pill nav links — Beranda, Agenda, Al-Qur'an, Konten, Shalat, Profil. Active link gets a soft gold-tinted pill background.
- Right: if logged out, a gold gradient pill "Masuk" button. If logged in, a pill showing a hex avatar (initial letter, gold gradient) + first name, linking to Dashboard (or Admin panel for admin role).
- <920px: right side instead shows a 44×44px hamburger (two full-width bars + one short bar to suggest a "menu" glyph). Tapping opens a dropdown panel below the header (slide-down, dark `#0B1430` panel) listing all nav links plus (when logged in) Dashboard / Panel Admin, each with a small hex-bullet.

### 2. Global Footer
- `#070E22` background, top gold hairline.
- Left: logo + name/sub, and an italic serif tagline "Serdadu Lebah, Bersenjata Dakwah."
- Two link columns: **Jelajah** (Agenda, Al-Qur'an, Waktu Shalat, Tulisan) and **Organisasi** (Profil & Struktur, Daftar Anggota, Masuk).
- Bottom bar: "© 1448 H / 2026 LDF An-Nahl · Fakultas Kedokteran Hewan USK" left, "Prototype v2" right.
- On mobile, an extra 78px spacer div reserves room for the fixed bottom nav bar.

### 3. Mobile Bottom Nav (<920px only)
- Fixed to viewport bottom, blurred dark bar, 5 items: Beranda, Agenda, Qur'an, Konten, Akun (Akun routes to Dashboard if logged in, else Login). Each item = hex-bullet dot + 11px bold label; active item turns gold.

### 4. Beranda (Home)
Sections top to bottom, all within a `max-width:1180px` centered container unless noted:
1. **Hero** (full-bleed dark gradient bg, decorative layers described above): eyebrow pill badge "✦ Lembaga Dakwah Fakultas · FKH USK", giant serif H1 "Serdadu Lebah, Bersenjata *Dakwah.*" (italic gold on second word), supporting paragraph, two CTAs ("Lihat Agenda" primary gold, "Kenali An-Nahl" outline). Right side: large circular logo (224px) floating (`lfloat`, slow bob) over a 4-hexagon cluster backdrop, with two small floating glass "chip" callouts ("Shalat berikutnya — {name} · {time}" and "Kajian rutin — Setiap pekan · Mushalla FKH").
2. **Quick strip** — 3 glass cards in a row (stacks on narrow widths): countdown to next prayer, nearest agenda (day-number hex badge + title), "Al-Qur'an / Mulai dari Al-Fatihah".
3. **Honeycomb divider**.
4. **Agenda terdekat** — section header + "Semua agenda →" link, then a grid of up to 3 upcoming-agenda cards (type badge, status label, serif title, date/time/location, dashed-top footer showing PJ or pemateri).
5. **Qur'an band** — full-width feature panel, centered, honeycomb pattern bg: Bismillah in Arabic (Amiri, glowing gold), serif headline "Sediakan waktu untuk Al-Qur'an hari ini", supporting copy, "Mulai Membaca" CTA.
6. **Konten section** — section header ("Islam Veteriner · Kisah · Renungan") + "Semua tulisan →", then 3 category cards, each: hex-bullet + serif category name, blurb, up to 2 article title rows (title + "N mnt"), "Jelajahi {category} →" link.
7. **Tentang + Join** — two-up grid: (a) glass quote card with an italic Qur'an quote from Surah An-Nahl (16:68) about bees building homes, + "Kenali organisasi kami →"; (b) gold-tinted "Bergabung" card inviting Open Recruitment sign-ups, "Daftar Anggota" CTA.

### 5. Agenda (List)
- Eyebrow "Agenda" + H1 "Kegiatan LDF An-Nahl" + intro line.
- Horizontal wrapping row of filter chips: Semua, Kajian, Rapat, Mentoring, Sosial, Olahraga, Rihlah, Open Recruitment — active chip filled gold gradient.
- Vertical list of agenda rows (upcoming first, then past), each: hex date badge (day number + month abbrev, colored by event type), type badge, status pill (Selesai/gray · Hari ini/green · Akan datang/blue-lavender), optional pulsing green "● QR aktif" badge, serif title, "{time} · {location}" line, trailing chevron. Whole row is clickable → Agenda Detail.

### 6. Agenda Detail
- "← Semua agenda" back link.
- One large glass panel: type + status badges (+ QR-active badge if applicable), serif H1 title, description paragraph, a 3–4 cell info grid (Waktu, Lokasi, Penanggung jawab, and — only if the event has a speaker — a gold-tinted "Pemateri" cell).
- Bottom action area (dashed top divider), mutually exclusive states:
  - **Already attended** (logged in + recorded): green check row "Kehadiranmu sudah tercatat. Alhamdulillah."
  - **Can check in** (logged in, QR active, not yet attended): green "Absen Sekarang — Pindai QR" button → Scan screen.
  - **Needs login** (QR active, logged out): explanatory line + "Masuk" button.
  - **No QR yet** (default/most common): muted note that QR isn't open yet.

### 7. Profil Organisasi
- Centered intro: eyebrow, H1 "Mengenal LDF An-Nahl", description.
- Two-up: (a) featured gold card — "Makna Nama": large Arabic "النَّحْل", "An-Nahl — Lebah", explanation paragraph about the bee/Surah 16 meaning; (b) "Sejarah Singkat" vertical timeline (hex-dot + connecting line) with 3 milestones — **content is explicit placeholder** ("20XX — …", marked "(Placeholder — isi dengan sejarah asli.)").
- Two-up: (a) gold "Visi" card with italic serif mission-statement quote — **placeholder**, labeled "Teks contoh — sesuaikan dengan visi resmi organisasi."; (b) "Misi" numbered list (hex-numbered bullets ×4) — **placeholder** content.
- **Struktur** section: centered org chart — Ketua Umum (large hex/circle avatar card) → connector line → 2 "inti" cards (Sekretaris Umum, Bendahara Umum) → connector line → responsive grid of 6 department cards (Kaderisasi, Syiar, Media & Informasi, Dana & Usaha, Kemuslimahan, Biro Kemushallaan), each with hex initial badge + name + one-line description. Footer note: "Nama pengurus masih placeholder — akan diisi sesuai SK kepengurusan."

### 8. Waktu Shalat (Prayer Times)
- Centered header: eyebrow, serif date (e.g. "Jumat, 3 Juli 2026"), Hijri date + city line ("± 8 Muharram 1448 H · Banda Aceh, Aceh" — city is a tweakable prop).
- Large feature panel: "Shalat berikutnya" eyebrow, huge serif prayer name, gold time, and a pill countdown timer (`−HH:MM:SS`, ticks live, subtle glow pulse).
- List panel: 6 rows (Subuh, Syuruq, Dzuhur, Ashar, Maghrib, Isya) each with hex-dot + name + time; Syuruq shows a small "terbit" note; the currently-next prayer row is highlighted (soft gold background + cream text vs. muted default).
- Disclaimer note that this is example data, to be wired to a real prayer-time source.
- Bottom: a framed Qur'an quote card (QS. Al-'Ankabut: 45, about prayer preventing indecency).

### 9. Al-Qur'an (List)
- Centered header: large Arabic "القُرْآنُ الكَرِيمُ", H1 "Al-Qur'anul Karim", intro line.
- Vertical list of 8 example surah rows: hex number badge, name + (if An-Nahl) a small "Surah kami" gold outline tag, "{arti} · {ayat} ayat · {tempat}" meta line, large Arabic surah name at trailing edge. Special/An-Nahl row uses the gold-tinted "featured card" treatment. Row click → Reader.
- Dashed-border note: full 114-surah list + official text will connect to an official digital mushaf source (e.g. Kemenag / KFGQPC) in the real build.

### 10. Al-Qur'an Reader
- "← Daftar surah" back link.
- Feature header panel: large Arabic surah name, serif Latin name, meta line (arti · ayat count · tempat turun).
- **If surah has text loaded** (only Al-Fatihah, no. 1, in this prototype): stacked ayat cards, each showing right-aligned Arabic (large, Amiri) with a trailing hex-numbered ayat marker, dashed divider, then the Indonesian translation below. Footer disclaimer that shown text is real but final translation will follow the official Kemenag RI translation.
- **If surah text isn't loaded** (all other 7 surahs): centered "locked" empty state — hex icon, "Teks surah ini belum dimuat" message explaining only Al-Fatihah is wired up in this prototype, "Baca Al-Fatihah" CTA back to the working example.

### 11. Konten (Articles List)
- Eyebrow "Bacaan", H1 "Tulisan An-Nahl", intro mentioning the 3 categories.
- Filter chips: Semua, Islam Veteriner, Kisah, Renungan (active chip filled with that category's color).
- Responsive card grid (auto-fill, min 280px): each card = category dot+label badge, "{mins} mnt baca", serif title, excerpt paragraph, "Baca selengkapnya →" pinned to card bottom. 9 example articles total (3 per category) — see full copy in the source file if rewriting content.

### 12. Artikel Detail
- "← Semua tulisan" back link.
- Category badge, serif H1 title, byline row ("Tim Media An-Nahl · {mins} menit baca · Konten contoh") with bottom hairline.
- Body: 2–3 flowing paragraphs (larger reading type, `16.5px/1.95`, warm off-white `#C9CFE2`).
- Dashed-border note flagging this is example editorial content, ready to be replaced by the real editorial team's writing.

### 13. Login
- Centered glass auth card (max 440px): circular logo, serif H1 "Ahlan wa sahlan", subtext.
- Fields: "Nama / NIM" text, "Kata sandi" password (both with gold-uppercase micro-labels).
- Primary "Masuk" pill button, then a secondary outline "Masuk sebagai Admin (demo)" button (one-click demo admin login — flag this as a prototype-only affordance, not for production).
- Footer link to Register. Disclaimer this is a mock login, not wired to a real account system.

### 14. Register
- Same card shell as Login, hex "ن" glyph icon instead of logo, H1 "Gabung ke koloni".
- Fields: Nama lengkap (full width), NIM + Angkatan (2-col row), Kata sandi. "Daftar & Masuk" primary button. Footer link to Login.

### 15. Dashboard (Member, requires login)
- Header row: "{greeting (time-of-day-aware)}, / Assalamu'alaikum, {first name}" + (Admin-only) "Panel Admin" button + "Keluar" (logout) button.
- 3 stat cards: Total kehadiran (count), Agenda mendatang (count), live countdown "Menuju {next prayer}" (links to Waktu Shalat).
- Two-column body:
  - **Absensi kegiatan** card: up to 4 upcoming-agenda rows, each showing title + relative date/time/QR-chip status, and either a green "Hadir ✓" badge (already attended) or an "Absen" button (opens Scan screen for that agenda).
  - **Riwayat kehadiran** card: reverse-chronological list of past check-ins (green hex-check + title + date + type badge).
  - A gold "featured" banner card linking onward to the Qur'an reader ("Lanjutkan membaca Al-Qur'an →").

### 16. Scan QR (Absen)
- "← Kembali" back link. Centered glass card: agenda title + meta being checked into.
- **Camera state** (default): a mocked viewfinder square (dark gradient, 4 corner brackets, a faint hex watermark, and — while "scanning" — an animated scanline sweep) + "Simulasikan Pindai QR" button (label/color change to "Memindai…" while running). Disclaimer this simulates a real camera QR scan.
- **Success state** (after ~1.6s, only if that agenda's QR is currently active): green check circle, "Alhamdulillah, tercatat!" message, "Kembali ke Dashboard" button.
- **Fail state** (QR not active for that agenda): red X circle, "QR belum aktif" message explaining check-in only works on-site while admin has it open, "Coba lagi" + "Dashboard" buttons.

### 17. Panel Admin (requires admin role)
- **Denied state** (not admin): centered card explaining the page is admin-only + "Masuk sebagai Admin (demo)" button.
- **Authorized state**: header ("Panel Admin" eyebrow, H1 "QR Absensi Kegiatan") + "← Dashboard" button, intro line. List of all upcoming agenda rows, each with type+status badges, title, date/time/location, and a trailing action: pulsing green "● Aktif" + "Lihat QR" button (if a QR session exists for that event) or a gold "Buat QR" button (to generate one).

### 18. Admin QR View
- "← Panel admin" back link. Centered card: pulsing "● QR absensi aktif" badge, event title + meta.
- A 21×21 module grid styled to look like a real QR code (cream background, dark modules, 3 corner "finder pattern" squares rendered accurately, remaining modules pseudo-random but seeded deterministically from the code string so it's stable per session) with the raw code string shown beneath (e.g. `ANH-A2-XXXX`).
- Disclaimer this is a dummy/decorative QR (not scannable) and that a production version should rotate the code periodically to prevent someone photographing/sharing it ("titip absen").
- "Nonaktifkan QR" destructive button to end the session.

---

## Interactions & Behavior
- **Routing**: single-page, state-driven (`state.route` string selects which screen renders) — no real URL changes, so browser back/forward and deep-linking do NOT work in the prototype. **Recommend implementing real routes/URLs in production** (e.g. `/agenda/:id`, `/quran/:surah`) for shareability and back-button support.
- **Prayer countdown**: recalculated every second against a **static hardcoded time table** (not geolocated or date-aware beyond "today"). Production needs a real prayer-time calculation or API (e.g. by city/coordinates), and the `kota` value should actually drive it.
- **QR check-in flow** (entirely mocked, no camera/crypto involved):
  1. Admin taps "Buat QR" → app generates a random string `ANH-{ID}-{4 random base36 chars}` and stores it in state (and localStorage) as that agenda's active QR.
  2. Member's "Absen" button opens the Scan screen; "Simulasikan Pindai QR" waits ~1.6s then checks whether the target agenda currently has an active QR in state — if yes, records `{agendaId, timestamp}` to an attendance list and shows success; if no, shows failure.
  3. Admin can "Nonaktifkan QR" to end a session (removes it from state).
  - Production must replace this with a real scanner (camera + QR decode), server-verified/expiring codes, and anti-replay protection (the UI copy already telegraphs this need — "QR berganti berkala untuk mencegah titip absen").
- **Auth**: fully mocked — any typed name/password "succeeds"; a dedicated one-tap "demo admin" button exists purely for prototype walkthroughs and should not ship. Session is just a `{name, role}` object in `localStorage`.
- **Responsive breakpoint**: 920px window width toggles between desktop top-nav and mobile hamburger+bottom-tab-bar layouts (tracked via a resize listener in state, not CSS media queries — fine to reimplement with real CSS breakpoints in production).
- **Hover/press states**: cards lift + brighten border/shadow on hover; buttons deepen shadow and lift slightly; nav items brighten text color. All interactive elements keep ≥44px touch targets.
- **Scroll-reveal**: sections marked for reveal fade/slide up as they enter viewport using `animation-timeline: view()` (a progressive enhancement — no-op / always-visible in browsers that don't support it, so it's safe to omit if the target stack doesn't want scroll-driven animations).

## State Management
Reference shape (from the prototype's single component state) to guide real state design:
- `route` — current screen key (see screen list above for the full enum).
- `user` — `null` or `{ name, role: 'member' | 'admin' }`. Persisted key: `annahl_user`.
- `agendaId` / `articleId` / `surahNo` — which detail record is open.
- `filter` (agenda type filter) / `kontenTab` (article category filter) — list filter UI state.
- `scanAgendaId`, `scanState` (`idle | scanning | success | fail`) — check-in flow state.
- `qrs` — map of `{ [agendaId]: code }` for active QR sessions. Persisted key: `annahl_qrs`.
- `att` — array of `{ id (agendaId), ts (timestamp) }` attendance records. Persisted key: `annahl_att`, seeded with 3 example past check-ins on first load.
- `formName`, `formPass` — login/register form fields (no validation in prototype).
- `now` — ticks every second to drive the live prayer countdown.
- `width` — tracks `window.innerWidth` for the responsive breakpoint.

All "data" beyond this UI state (agenda list, articles, surah metadata, org structure, prayer times) is **hardcoded seed data inside the prototype file** — see "Data Requirements for Production" below for what needs a real source instead.

## Data Requirements for Production
This is a UI prototype layered over fake data. Before/while implementing, the team should plan real data sources for:
- **Users & auth**: real accounts (member vs. admin role), likely tied to NIM/university identity. Currently zero validation.
- **Agenda/events**: currently 10 hardcoded example events (7 upcoming + 3 past) covering types Kajian, Rapat, Mentoring, Sosial, Olahraga, Rihlah, Open Recruitment — needs a real CMS/database (title, type, date/time range, location, PJ, optional pemateri, description).
- **Attendance & QR sessions**: needs a real backend — server-issued, time-boxed/rotating QR codes tied to a specific event + verified server-side on scan, plus a persisted attendance ledger. This is the highest-risk area for abuse (see "titip absen" concern already called out in the UI copy) and is worth extra design/architecture attention, not just a straight port of the mock logic.
- **Prayer times**: currently one static table of times for "today" regardless of actual date/location. Needs a real calculation method or API, keyed off the `kota` (city) setting.
- **Qur'an content**: only Surah Al-Fatihah has real ayat text + translation (used as a working example); the other 7 listed surahs are metadata-only "locked" placeholders, and only 8 of 114 surahs are listed at all. Production should integrate an official source (the prototype copy suggests Kemenag / KFGQPC) for the full mushaf + official Indonesian translation.
- **Articles/content**: 9 example articles (3 each in Islam Veteriner / Kisah / Renungan) are real prototype copy usable as tone/length reference, but are explicitly placeholder editorial content — needs a real authoring/CMS flow for the media team.
- **Org profile data**: name meaning + Surah An-Nahl framing is final copy; history timeline, vision/mission text, and all leadership/department names are explicitly marked placeholder pending the real SK kepengurusan (organizational decree).

## Design Tokens

**Backgrounds**: page `#0A1128` (deep navy); header `rgba(8,14,34,.82)` w/ blur; footer/deepest panels `#070E22`/`#060D20`; glass card fill `rgba(255,255,255,.03–.05)`.

**Text**: heading/primary `#F5EFDC` (warm cream); body/secondary `#A9B3D1`; muted/tertiary `#8E99BB`; faint/disclaimer `#5E6B8F`; article reading body `#C9CFE2`; on-gold text `#241B04` / `#0A1128`.

**Gold (brand accent)**: gradient `linear-gradient(135deg, #E8C766, #C9A227)`; solid uses `#E8C766` (light) and `#C9A227` (dark/eyebrow labels); borders typically that gold at 14–35% alpha depending on emphasis.

**Status/semantic**: success/green `#5CCBA0` → `#2E9C77` (darker) / `#1F8A63` (scan button); danger/red `#E58A8A` (text) / `#C0524A` (solid); "today" status reuses green, "upcoming" reuses gold-lavender blue.

**Category/type colors** (used for badges, chips, hex icons):
- Kajian `#8FAAF5`, Rapat `#9AA8C9`, Mentoring `#5CCBA0`, Sosial `#E8C766`, Olahraga `#5FC6DE`, Rihlah `#C39BE8`, Open Recruitment `#EE9AC0` (agenda types)
- Islam Veteriner `#8FAAF5`, Kisah `#E8C766`, Renungan `#5FC6DE` (article categories)
- Badge backgrounds = that color at ~`1F` hex alpha (~12%) over the dark surface.

**Typography**:
- **Cormorant Garamond** (serif, weights 500/600/700 + italics) — all display headings, quotes, "featured number" moments. Hero H1 ~`clamp(52px,8vw,96px)`, section H2 ~`clamp(30–34px, ~4.5vw, 48–56px)`, card/sub headings ~22–27px.
- **Manrope** (sans, 400–800) — all UI/body text. Eyebrows 10–11.5px/weight 800/letter-spacing .16–.26em/uppercase; body copy 13.5–16.5px, line-height 1.65–1.95.
- **Amiri** (Arabic serif) — all Qur'anic/Arabic text, sizes vary by context (20px small inline glyphs up to 46px hero Bismillah), typically gold `#E8C766` with a soft glow text-shadow, `dir="rtl"`.
- (A Lora font is loaded in `<head>` but not visibly used — safe to drop unless found elsewhere.)

**Radii**: 10–14px small controls; 16–20px rows/inputs; 20–26px standard cards; 28–30px hero/auth panels; 999px pills (buttons, badges, avatars).

**Shadows**: cards use an inset top highlight `inset 0 1px 0 rgba(255,255,255,.05–.07)` at rest, plus an outer gold-tinted glow on hover (`0 18–26px 38–52px -20/-22px rgba(201,162,39,.3–.32)`); primary buttons carry a permanent gold glow shadow that deepens on hover; auth cards use a large soft black shadow (`0 30px 60px -32px rgba(0,0,0,.6)`).

**Signature shape**: hexagon `clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)` — see "Design Language" above.

**Motion**: `breath`/`breathB` ambient glow pulse (7–9s ease-in-out loop), `lf` gentle float (7s), `beeF` wandering bee flight (11–18s), `cdG`/`cdGlow` countdown text-glow pulse (2.6s), `softPulse` opacity pulse for "active" badges (2s), `scanline` QR-scan sweep (2s), plus a scroll-triggered fade/slide-up (`rvIn`, via `animation-timeline: view()`).

## Assets
- `assets/logo.png` — organization's circular logo mark. Used at multiple sizes: 42px (header/footer), 224px (hero), 64px (login). No other bitmap imagery is used; all other visuals (bee sprites, honeycomb pattern, mosque silhouette, QR grid) are drawn with CSS/gradients/clip-path, not image assets.

## Files
- `reference/LDF An-Nahl v2.dc.html` — the full prototype (all 18 screens/states live in one file, screen switching handled by internal state — open it and click around to see exact behavior). This is the **latest ("v2", dark luxe)** version; treat it as the source of truth over any earlier version you may find elsewhere.
- `reference/support.js` — internal runtime the prototype needs to render; irrelevant to production, included only so the reference file opens correctly if double-clicked locally.
- `reference/assets/logo.png` — logo asset described above.

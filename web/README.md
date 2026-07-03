# LDF An-Nahl — Website

Production implementation of the LDF An-Nahl (Lembaga Dakwah Fakultas, FKH USK) website, built from the "dark luxe" v2 design in `../project/LDF An-Nahl v2.dc.html` and its handoff spec in `../project/design_handoff_ldf_annahl_app/README.md`.

Stack: **Vite + React + TypeScript + React Router**, plain CSS with CSS Modules and a shared design-token file.

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## Structure

- `src/pages/` — one component per route (Home, Agenda, Profil, Shalat, Quran, Konten, Login, Dashboard, Scan, Admin, …)
- `src/components/ui/` — shared design-system primitives (`Hex`, `GlassCard`, `Button`, `Badge`, `FilterChip`, `SectionHeader`, `Divider`, `DashedNote`)
- `src/components/layout/` — `Header`, `Footer`, `BottomNav`, `Layout` (responsive at 920px via CSS media queries)
- `src/state/AppContext.tsx` — mock auth/QR/attendance state, persisted to `localStorage` (mirrors the prototype's mock backend)
- `src/data/` — seed content (agendas, articles, surahs, org profile)
- `src/lib/` — pure helpers (dates, colors, prayer-time math, QR grid generation, etc.)

## What's still mocked (see the handoff README's "Data Requirements for Production")

- **Auth** — any name/password "succeeds"; there's a one-tap demo-admin login. Not for production.
- **QR attendance** — client-side only, stored in `localStorage`. Needs a real backend with server-issued, time-boxed/rotating codes before this ships for real events (the UI copy already flags the "titip absen" risk this needs to solve).
- **Prayer times** — one static table for "today," not location- or date-aware.
- **Qur'an** — only Al-Fatihah has real ayat text; the other 7 listed surahs are metadata-only, and only 8 of 114 surahs are listed.
- **Articles, org history, vision/mission, leadership names** — placeholder/example content, explicitly marked as such in the UI.

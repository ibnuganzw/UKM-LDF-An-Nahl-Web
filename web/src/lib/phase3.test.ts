import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildAgendaIcs, buildGoogleCalendarUrl } from './calendar';
import { buildAttendanceCsv, escapeCsvCell } from './csv';
import {
  createQuranBookmark,
  createReadingProgress,
  normalizeCollections,
  toggleQuranBookmark,
} from './quranLibrary';
import { buildVerseShareText } from './quranShare';
import { QURAN_DATA_URLS, QURAN_OFFLINE_URLS } from './pwa';
import type { Agenda, QuranVerse } from '../types';

const verse: QuranVerse = {
  id: 1,
  verse_key: '1:1',
  chapter_id: 1,
  verse_number: 1,
  text_uthmani: 'بِسْمِ اللَّهِ',
  text_indopak: '',
  text_uthmani_tajweed: '',
  translation_id: 'Dengan nama Allah.',
};

const agenda: Agenda = {
  id: 'agenda-1',
  title: 'Kajian, Profesi; Amanah',
  type: 'Kajian',
  mode: 'universal',
  eventDate: '2026-08-10',
  startTime: '09:00',
  endTime: '11:00',
  location: 'Mushalla FKH, USK',
  pj: 'Divisi Syiar',
  pemateri: null,
  description: 'Iman dan ilmu\nuntuk profesi.',
  qrOpenedAt: null,
  createdBy: null,
  createdAt: '2026-08-01T00:00:00Z',
};

describe('Phase 3 Quran continuity', () => {
  it('normalizes collections and toggles one verse per collection', () => {
    expect(normalizeCollections([' Favorit ', 'Tadabbur', 'tadabbur', 'Hafalan'])).toEqual(['Favorit', 'Tadabbur', 'Hafalan']);
    const bookmark = createQuranBookmark(verse, 'Tadabbur', '/quran/1#ayat-1', '2026-08-03T00:00:00Z');
    expect(toggleQuranBookmark([], bookmark)).toEqual([bookmark]);
    expect(toggleQuranBookmark([bookmark], bookmark)).toEqual([]);
  });

  it('records the exact continuation path and builds a branded share text', () => {
    expect(createReadingProgress(verse, '/quran/1#ayat-1', 'Surah Al-Fatihah · Ayat 1', '2026-08-03T00:00:00Z')).toMatchObject({
      verseKey: '1:1',
      path: '/quran/1#ayat-1',
      label: 'Surah Al-Fatihah · Ayat 1',
    });
    expect(buildVerseShareText(verse)).toContain('QS. Al-Fatihah: 1');
    expect(buildVerseShareText(verse)).toContain('LDF An-Nahl FKH USK');
  });

  it('keeps one global audio provider and removes route-local teardown', () => {
    const main = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
    const surahReader = readFileSync(new URL('../pages/QuranReader.tsx', import.meta.url), 'utf8');
    const juzReader = readFileSync(new URL('../pages/JuzReader.tsx', import.meta.url), 'utf8');
    expect(main).toContain('<QuranAudioProvider>');
    expect(surahReader).toContain('useQuranAudio()');
    expect(juzReader).toContain('useQuranAudio()');
    expect(surahReader).not.toContain('useQuranAudioPlayer');
    expect(juzReader).not.toContain('useQuranAudioPlayer');
  });
});

describe('Phase 3 offline, calendar, and operations', () => {
  it('enumerates every local chapter and supplement for explicit offline download', () => {
    expect(QURAN_DATA_URLS).toHaveLength(228);
    expect(QURAN_OFFLINE_URLS).toHaveLength(231);
    expect(new Set(QURAN_OFFLINE_URLS).size).toBe(QURAN_OFFLINE_URLS.length);
  });

  it('ships an installable manifest and same-origin service worker shell', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8')) as Record<string, unknown>;
    const worker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(manifest).toMatchObject({ display: 'standalone', start_url: '/', lang: 'id-ID' });
    expect(worker).toContain("url.origin !== self.location.origin");
    expect(worker).toContain("request.mode === 'navigate'");
    expect(html).toContain('rel="manifest"');
  });

  it('creates Jakarta calendar files with a 30-minute reminder and Google handoff', () => {
    const ics = buildAgendaIcs(agenda);
    expect(ics).toContain('DTSTART;TZID=Asia/Jakarta:20260810T090000');
    expect(ics).toContain('TRIGGER:-PT30M');
    expect(ics).toContain('SUMMARY:Kajian\\, Profesi\\; Amanah');
    const google = buildGoogleCalendarUrl(agenda);
    expect(google).toContain('calendar.google.com/calendar/render');
    expect(decodeURIComponent(google)).toContain('20260810T020000Z/20260810T040000Z');
  });

  it('exports spreadsheet-safe attendance CSV', () => {
    expect(escapeCsvCell('=IMPORTXML("bad")')).toBe('"\'=IMPORTXML(""bad"")"');
    const csv = buildAttendanceCsv([{ name: 'Ibnu, A', nim: '123', registered: true, registeredAt: '', attended: true, checkedInAt: '', method: 'self_scan' }]);
    expect(csv).toContain('"Ibnu, A"');
    expect(csv).toContain('"Pindai QR"');
  });

  it('defines a DB-side, admin-readable audit log without retaining QR tokens or article HTML', () => {
    const migration = readFileSync(new URL('../../supabase/migrations/20260803110000_phase10_admin_audit_log.sql', import.meta.url), 'utf8');
    expect(migration).toContain('create table public.admin_audit_logs');
    expect(migration).toContain('private.capture_admin_audit()');
    for (const table of ['agendas', 'event_registrations', 'event_attendance', 'articles', 'profiles', 'org_positions', 'division_members']) {
      expect(migration).toContain(`on public.${table}`);
    }
    expect(migration).toContain("- 'qr_token' - 'content_html'");
    expect(migration).toContain('revoke all on public.admin_audit_logs from anon, authenticated');
    expect(migration).toContain('revoke all on sequence public.admin_audit_logs_id_seq from anon, authenticated');
    expect(migration).toContain('grant select on public.admin_audit_logs to authenticated');
  });
});

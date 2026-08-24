import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAgendaIcs, buildGoogleCalendarUrl } from './calendar';
import { buildAttendanceCsv, escapeCsvCell } from './csv';
import {
  createQuranBookmark,
  createReadingProgress,
  normalizeCollections,
  toggleQuranBookmark,
} from './quranLibrary';
import { buildVerseShareText } from './quranShare';
import { downloadBlob, shareBlobOrDownload } from './download';
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

afterEach(() => {
  vi.unstubAllGlobals();
});

function installDownloadHarness() {
  const link = {
    href: '',
    download: '',
    rel: '',
    style: { display: '' },
    click: vi.fn(),
    remove: vi.fn(),
  };
  const appendChild = vi.fn();
  const createObjectURL = vi.fn(() => 'blob:acceptance-download');
  const revokeObjectURL = vi.fn();
  const setTimeout = vi.fn();

  vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { appendChild } });
  vi.stubGlobal('window', { setTimeout });
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

  return { link, appendChild, createObjectURL, revokeObjectURL, setTimeout };
}

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

  it('attaches blob downloads to the document before clicking them', () => {
    const harness = installDownloadHarness();
    downloadBlob(new Blob(['acceptance']), 'acceptance.txt');

    expect(harness.createObjectURL).toHaveBeenCalledOnce();
    expect(harness.appendChild).toHaveBeenCalledWith(harness.link);
    expect(harness.link).toMatchObject({
      href: 'blob:acceptance-download',
      download: 'acceptance.txt',
      rel: 'noopener',
      style: { display: 'none' },
    });
    expect(harness.link.click).toHaveBeenCalledOnce();
    expect(harness.link.remove).toHaveBeenCalledOnce();
    expect(harness.setTimeout).toHaveBeenCalledOnce();
  });

  it('falls back to the generated download when native sharing fails', async () => {
    const harness = installDownloadHarness();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('activation expired'), { name: 'NotAllowedError' }));
    vi.stubGlobal('navigator', { share, canShare: vi.fn(() => true) });

    await expect(shareBlobOrDownload(new Blob(['card']), 'ayat-1-1.png', { title: 'Ayat 1:1' }))
      .resolves.toBe('downloaded');
    expect(share).toHaveBeenCalledOnce();
    expect(harness.link.download).toBe('ayat-1-1.png');
    expect(harness.link.click).toHaveBeenCalledOnce();
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

  it('gives the mobile surah ornament a full-width, readable composition', () => {
    const styles = readFileSync(new URL('../components/SurahHeader.module.css', import.meta.url), 'utf8');

    expect(styles).toMatch(/@media \(max-width: 480px\)[\s\S]*\.wrapper[\s\S]*width: calc\(100% \+ 32px\)/);
    expect(styles).toMatch(/@media \(max-width: 480px\)[\s\S]*\.titleName \{ font-size: \.68em; \}/);
    expect(styles).toMatch(/@media \(max-width: 480px\)[\s\S]*\.verseNumber \{ font-size: \.19em; \}/);
    expect(styles).toContain('transform: translate(-50%, -50%)');
  });
});

describe('Phase 3 offline, calendar, and operations', () => {
  it('enumerates every local chapter and supplement for explicit offline download', () => {
    expect(QURAN_DATA_URLS).toHaveLength(228);
    expect(QURAN_OFFLINE_URLS).toHaveLength(231);
    expect(new Set(QURAN_OFFLINE_URLS).size).toBe(QURAN_OFFLINE_URLS.length);
  });

  it('ships an installable manifest and same-origin service worker shell', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8')) as {
      display: string;
      icons: Array<{ purpose?: string; sizes: string; src: string; type: string }>;
      id: string;
      lang: string;
      start_url: string;
    };
    const worker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(manifest).toMatchObject({ display: 'standalone', id: '/', start_url: '/', lang: 'id-ID' });
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable', type: 'image/png' }),
    ]));
    for (const filename of ['logo-512.png', 'logo-maskable-512.png']) {
      const icon = readFileSync(new URL(`../../public/assets/${filename}`, import.meta.url));
      expect(icon.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(icon.readUInt32BE(16)).toBe(512);
      expect(icon.readUInt32BE(20)).toBe(512);
      expect(worker).toContain(`/assets/${filename}`);
    }
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

  it('uses the same attached blob-download path for calendar and attendance files', () => {
    const calendar = readFileSync(new URL('./calendar.ts', import.meta.url), 'utf8');
    const csv = readFileSync(new URL('./csv.ts', import.meta.url), 'utf8');
    expect(calendar).toContain('downloadBlob(blob, `agenda-${agenda.eventDate}-${agenda.id.slice(0, 8)}.ics`)');
    expect(csv).toContain('downloadBlob(blob, filename)');
  });

  it('configures exactly one Tiptap link extension', () => {
    const editor = readFileSync(new URL('../components/editor/ArticleEditor.tsx', import.meta.url), 'utf8');
    expect(editor).toContain('StarterKit.configure({ link: false })');
    expect(editor).toContain('Link.configure({ openOnClick: false, autolink: true })');
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

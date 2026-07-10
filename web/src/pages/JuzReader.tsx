import DOMPurify from 'dompurify';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import styles from './QuranReader.module.css';
import { Button, Hex } from '../components/ui';
import { SurahHeader } from '../components/SurahHeader';
import { JUZS } from '../data/juzs';
import { SURAHS } from '../data/surahs';
import { useQuranAudioPlayer } from '../hooks/useQuranAudioPlayer';
import { cx } from '../lib/cx';
import { fetchQuranJuz, fetchQuranJuzSupplements, getFallbackQuranVerses } from '../lib/quranClient';
import { DEFAULT_RECITER_ID, isKnownReciter, RECITERS } from '../lib/quranAudio';
import { quranText } from '../lib/quranText';
import { loadJSON, saveJSON } from '../lib/storage';
import { scanTajweedClasses, TAJWEED_LEGEND, type TajweedLegendItem } from '../lib/tajweedLegend';
import type { QuranReaderSettings, QuranVerse, Juz } from '../types';

const ARABIC_INDIC_DIGITS = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
const ARABIC_DISPLAY_STRIP_PATTERN = /[\u061c\u200b-\u200f\ufeff]/g;
const SPACE_PATTERN = /\s+/g;
const ARABIC_COMBINING_MARKS = '[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E8\\u06EA-\\u06ED]';
const ARABIC_LETTERS = '[\\u0621-\\u064A\\u0671]';
const READER_SETTINGS_KEY = 'annahl_quran_reader_settings';
const FONT_SIZE_MIN = 30;
const FONT_SIZE_MAX = 56;
const DEFAULT_READER_SETTINGS: QuranReaderSettings = {
  script: 'uthmani',
  tajweedEnabled: true,
  arabicFontSize: 42,
  showLatin: true,
  showTranslation: true,
  reciter: DEFAULT_RECITER_ID,
};
const TAJWEED_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['tajweed', 'span'],
  ALLOWED_ATTR: ['class'],
};

type ChapterStatus = 'loading' | 'ready' | 'fallback' | 'error';

interface ChapterState {
  status: ChapterStatus;
  verses: QuranVerse[];
  message?: string;
  source?: string;
}

function toArabicIndic(value: number): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)]);
}

function cleanArabicDisplayText(text: string): string {
  return text.replace(ARABIC_DISPLAY_STRIP_PATTERN, '').replace(SPACE_PATTERN, ' ').trim();
}



function formatJuzOption(juz: Juz): string {
  return `Juz ${juz.juz_number}`;
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findJuz(query: string): Juz | undefined {
  const trimmed = query.trim();
  if (!trimmed) {
    return undefined;
  }

  const no = Number(trimmed.match(/^\d+/)?.[0]);

  if (Number.isFinite(no) && no > 0) {
    return JUZS.find((juz) => juz.juz_number === no);
  }

  const normalized = normalizeSearch(trimmed);
  return JUZS.find((juz) => {
    const name = normalizeSearch(`juz ${juz.juz_number}`);
    return name.includes(normalized);
  });
}

function clampAyah(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.round(value), 1), max);
}

function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_READER_SETTINGS.arabicFontSize;
  }

  return Math.min(Math.max(Math.round(value), FONT_SIZE_MIN), FONT_SIZE_MAX);
}

interface AyahTarget {
  chapterId: number;
  verseNumber: number;
}

/** Resolves a 1-based position within a juz's flattened verse sequence (as used by the
 * "Ayat" search field, 1..verses_count) to the surah + local ayah it falls in. */
function resolveJuzPosition(juz: Juz, position: number): AyahTarget | undefined {
  let cumulative = 0;

  for (const [chapterStr, range] of Object.entries(juz.verse_mapping)) {
    const [start, end] = range.split('-').map(Number);
    const count = end - start + 1;

    if (position <= cumulative + count) {
      return { chapterId: Number(chapterStr), verseNumber: start + (position - cumulative) - 1 };
    }

    cumulative += count;
  }

  return undefined;
}

/** Inverse of resolveJuzPosition: given a surah + local ayah, finds its 1-based position
 * within this juz's flattened verse sequence. */
function findJuzPosition(juz: Juz, chapterId: number, verseNumber: number): number | undefined {
  let cumulative = 0;

  for (const [chapterStr, range] of Object.entries(juz.verse_mapping)) {
    const [start, end] = range.split('-').map(Number);

    if (Number(chapterStr) === chapterId) {
      return verseNumber >= start && verseNumber <= end ? cumulative + (verseNumber - start) + 1 : undefined;
    }

    cumulative += end - start + 1;
  }

  return undefined;
}

function getAyahFromHash(hash: string, juz: Juz): AyahTarget | undefined {
  const match = hash.match(/^#ayat-(\d+)-(\d+)$/);

  if (!match) {
    return undefined;
  }

  const chapterId = Number(match[1]);
  const verseNumber = Number(match[2]);
  const range = juz.verse_mapping[String(chapterId)];

  if (!range) {
    return undefined;
  }

  const [start, end] = range.split('-').map(Number);

  if (verseNumber < start || verseNumber > end) {
    return undefined;
  }

  return { chapterId, verseNumber };
}

function normalizeReaderSettings(value: Partial<QuranReaderSettings> | null): QuranReaderSettings {
  return {
    script: value?.script === 'uthmani' ? value.script : DEFAULT_READER_SETTINGS.script,
    tajweedEnabled: typeof value?.tajweedEnabled === 'boolean' ? value.tajweedEnabled : DEFAULT_READER_SETTINGS.tajweedEnabled,
    arabicFontSize: clampFontSize(Number(value?.arabicFontSize ?? DEFAULT_READER_SETTINGS.arabicFontSize)),
    showLatin: typeof value?.showLatin === 'boolean' ? value.showLatin : DEFAULT_READER_SETTINGS.showLatin,
    showTranslation: typeof value?.showTranslation === 'boolean' ? value.showTranslation : DEFAULT_READER_SETTINGS.showTranslation,
    reciter: typeof value?.reciter === 'string' && isKnownReciter(value.reciter) ? value.reciter : DEFAULT_READER_SETTINGS.reciter,
  };
}

function getInitialChapterState(chapterNumber: number): ChapterState {
  const fallbackVerses = getFallbackQuranVerses(chapterNumber);

  if (fallbackVerses.length > 0) {
    return {
      status: 'fallback',
      verses: fallbackVerses,
      message: 'Menampilkan data lokal Al-Fatihah sambil mencoba endpoint server.',
    };
  }

  return {
    status: 'loading',
    verses: [],
  };
}

function fixTajweedHtml(html: string): string {
  if (!html) return html;
  
  // 1. Replace generic Sukun (U+0652) with QPC Hafs pronounced Sukun (U+06E1)
  let fixed = html.replace(/\u0652/g, '\u06E1');
  
  // 2. Revert Sukun to generic Zero (U+0652) inside <tajweed class="slnt"> tags
  fixed = fixed.replace(/(<tajweed[^>]*class=['"]?slnt['"]?[^>]*>.*?<\/tajweed>)/g, (match) => {
    return match.replace(/\u06E1/g, '\u0652');
  });

  // 3. Remove Tatweel (U+0640) which breaks UthmanicHafs font
  fixed = fixed.replace(/\u0640/g, '');
  
  // 4. Replace Alef with Wavy Hamza Above (U+0672) with Superscript Alef (U+0670)
  fixed = fixed.replace(/\u0672/g, '\u0670');
  
  // 5. Move combining marks immediately after a closing tag INSIDE the closing tag
  const regexA = new RegExp(`(</tajweed>)(${ARABIC_COMBINING_MARKS}+)`, 'g');
  fixed = fixed.replace(regexA, '$2$1');

  // 6. Move the preceding base character INSIDE an opening tag that starts with a combining mark
  const regexB = new RegExp(`(${ARABIC_LETTERS}${ARABIC_COMBINING_MARKS}*)(</tajweed>)?(<tajweed[^>]*>)(${ARABIC_COMBINING_MARKS}+)`, 'g');
  fixed = fixed.replace(regexB, (_match, p1, p2, p3, p4) => {
    return `${p3}${p1}${p4}${p2 || ''}`;
  });
  
  return fixed;
}

function getArabicText(verse: QuranVerse): string {
  return quranText(cleanArabicDisplayText(verse.text_uthmani));
}



function AyahMarker({ number }: { number: number }) {
  return (
    <span className={styles.ayatMarker} aria-label={`Ayat ${number}`}>
      <span>{toArabicIndic(number)}</span>
    </span>
  );
}

function AyahPlayButton({
  ayahNumber,
  isActive,
  isPlaying,
  onClick,
}: {
  ayahNumber: number;
  isActive: boolean;
  isPlaying: boolean;
  onClick: () => void;
}) {
  const playingNow = isActive && isPlaying;

  return (
    <button
      type="button"
      className={cx(styles.ayatPlayButton, isActive && styles.ayatPlayButtonActive)}
      aria-label={playingNow ? `Jeda ayat ${ayahNumber}` : `Putar ayat ${ayahNumber}`}
      aria-pressed={playingNow}
      onClick={onClick}
    >
      <span aria-hidden="true">{playingNow ? '❚❚' : '▶'}</span>
    </button>
  );
}

function QuranArabic({ settings, verse }: { settings: QuranReaderSettings; verse: QuranVerse }) {
  const useTajweed = settings.tajweedEnabled;
  const scriptClass = 'quran-arabic--uthmani';
  const showExternalMarker = false;
  const cleanHtml = useMemo(
    () => (useTajweed ? DOMPurify.sanitize(fixTajweedHtml(verse.text_uthmani_tajweed), TAJWEED_SANITIZE_CONFIG) : ''),
    [useTajweed, verse.text_uthmani_tajweed],
  );
  const className = cx(
    styles.ayatArabic,
    'quran-arabic',
    scriptClass,
    useTajweed && 'quran-arabic--tajweed',
  );

  return (
    <div dir="rtl" lang="ar" translate="no" className={className}>
      {showExternalMarker && <AyahMarker number={verse.verse_number} />}
      {useTajweed ? (
        <span className={styles.tajweedContent} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
      ) : (
        <span className={styles.arabicText}>
          {getArabicText(verse)}
        </span>
      )}
    </div>
  );
}

function LegendRow({ item }: { item: TajweedLegendItem }) {
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendSwatch} style={{ background: item.color }} aria-hidden="true" />
      <span>
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
    </div>
  );
}

interface ReaderSettingsPanelProps {
  legendClasses: string[];
  legendOpen: boolean;
  onChange: <K extends keyof QuranReaderSettings>(key: K, value: QuranReaderSettings[K]) => void;
  onClose: () => void;
  onToggleLegend: () => void;
  settings: QuranReaderSettings;
}

function ReaderSettingsPanel({ legendClasses, legendOpen, onChange, onClose, onToggleLegend, settings }: ReaderSettingsPanelProps) {
  const knownLegendItems = legendClasses
    .map((className) => TAJWEED_LEGEND[className])
    .filter((item): item is TajweedLegendItem => Boolean(item));
  const unknownLegendClasses = legendClasses.filter((className) => !TAJWEED_LEGEND[className]);

  return (
    <div className={styles.settingsOverlay} role="presentation" onMouseDown={onClose}>
      <section
        className={cx(styles.settingsPanel, 'reader-settings-panel')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.settingsHeader}>
          <h2 id="reader-settings-title">Pengaturan Bacaan</h2>
          <button type="button" className={styles.settingsClose} aria-label="Tutup pengaturan" onClick={onClose}>
            x
          </button>
        </div>



        <div className={styles.settingsGroup}>
          <div className={styles.settingsRow}>
            <span className={styles.settingsLabel}>Tajwid warna</span>
            <label className={styles.switchControl}>
              <input
                type="checkbox"
                checked={settings.tajweedEnabled}
                onChange={(event) => onChange('tajweedEnabled', event.target.checked)}
              />
              <span className={styles.switchTrack} aria-hidden="true" />
              <span className={styles.switchText}>{settings.tajweedEnabled ? 'ON' : 'OFF'}</span>
            </label>
          </div>



          <button type="button" className={styles.legendButton} onClick={onToggleLegend} aria-expanded={legendOpen}>
            Panduan warna
          </button>

          {legendOpen && (
            <div className={cx(styles.tajweedLegend, 'tajweed-legend')}>
              {legendClasses.length === 0 && <p className={styles.legendEmpty}>Belum ada class tajwid pada surah ini.</p>}

              {knownLegendItems.map((item) => (
                <LegendRow key={item.className} item={item} />
              ))}

              {unknownLegendClasses.length > 0 && (
                <div className={styles.legendUnknown}>
                  <div className={styles.legendUnknownTitle}>Lainnya</div>
                  {unknownLegendClasses.map((className) => (
                    <div key={className} className={styles.legendItem}>
                      <span className={styles.legendSwatch} style={{ background: 'var(--tajweed-unknown)' }} aria-hidden="true" />
                      <span>
                        <strong>{className}</strong>
                        <small>Class tajwid dari data resmi yang belum dipetakan.</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.settingsGroup}>
          <div className={styles.settingsRow}>
            <span className={styles.settingsLabel}>Ukuran huruf Arab</span>
            <span className={styles.fontSizeValue}>{settings.arabicFontSize}px</span>
          </div>
          <div className={styles.fontSliderRow}>
            <button
              type="button"
              className={styles.fontButton}
              aria-label="Perkecil font Arab"
              disabled={settings.arabicFontSize <= FONT_SIZE_MIN}
              onClick={() => onChange('arabicFontSize', clampFontSize(settings.arabicFontSize - 2))}
            >
              A-
            </button>
            <input
              type="range"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={1}
              value={settings.arabicFontSize}
              aria-label="Ukuran font Arab"
              onChange={(event) => onChange('arabicFontSize', clampFontSize(Number(event.target.value)))}
            />
            <button
              type="button"
              className={styles.fontButton}
              aria-label="Perbesar font Arab"
              disabled={settings.arabicFontSize >= FONT_SIZE_MAX}
              onClick={() => onChange('arabicFontSize', clampFontSize(settings.arabicFontSize + 2))}
            >
              A+
            </button>
          </div>
        </div>

        <div className={styles.settingsGroup}>
          <div className={styles.settingsLabel}>Teks pendamping</div>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={settings.showLatin} onChange={(event) => onChange('showLatin', event.target.checked)} />
            <span>Latin</span>
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={settings.showTranslation}
              onChange={(event) => onChange('showTranslation', event.target.checked)}
            />
            <span>Terjemahan</span>
          </label>
        </div>

        <div className={styles.settingsGroup}>
          <div className={styles.settingsLabel}>Qari (Murottal)</div>
          <select
            className={styles.reciterSelect}
            value={settings.reciter}
            onChange={(event) => onChange('reciter', event.target.value)}
          >
            {RECITERS.map((reciter) => (
              <option key={reciter.id} value={reciter.id}>
                {reciter.name}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}

export default function JuzReader() {
  const { no } = useParams<{ no: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const rd = JUZS.find((j) => j.juz_number === Number(no)) ?? JUZS[0];
  const currentIndex = JUZS.findIndex((j) => j.juz_number === rd.juz_number);
  const prevJuz = currentIndex > 0 ? JUZS[currentIndex - 1] : undefined;
  const nextJuz = currentIndex < JUZS.length - 1 ? JUZS[currentIndex + 1] : undefined;
  const activeTarget = getAyahFromHash(location.hash, rd);
  const selectedPosition = (activeTarget && findJuzPosition(rd, activeTarget.chapterId, activeTarget.verseNumber)) ?? 1;
  const [juzQuery, setJuzQuery] = useState(formatJuzOption(rd));
  const [ayahQuery, setAyahQuery] = useState(String(selectedPosition));
  const [dockOpen, setDockOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [settings, setSettings] = useState<QuranReaderSettings>(() =>
    normalizeReaderSettings(loadJSON<Partial<QuranReaderSettings> | null>(READER_SETTINGS_KEY, null)),
  );
  const [chapterState, setChapterState] = useState<ChapterState>(() => getInitialChapterState(1));
  const readerReady = chapterState.verses.length > 0;
  const tajweedClasses = useMemo(() => scanTajweedClasses(chapterState.verses), [chapterState.verses]);
  const quranPageFontCss = '';
  const tajweedUnavailable = settings.script === 'indopak' && settings.tajweedEnabled;
  const audioPlayer = useQuranAudioPlayer(chapterState.verses, settings.reciter);

  useEffect(() => {
    setJuzQuery(formatJuzOption(rd));
    setAyahQuery(String(selectedPosition));
  }, [rd, selectedPosition]);

  useEffect(() => {
    return () => {
      audioPlayer.stop();
    };
  }, [rd.juz_number]);

  useEffect(() => {
    if (!audioPlayer.playingVerseKey) {
      return;
    }

    const [chapterIdPart, verseNumberPart] = audioPlayer.playingVerseKey.split(':');
    const chapterId = Number(chapterIdPart);
    const verseNumber = Number(verseNumberPart);
    if (!Number.isFinite(chapterId) || !Number.isFinite(verseNumber)) {
      return;
    }

    document.getElementById(`ayat-${chapterId}-${verseNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [audioPlayer.playingVerseKey]);

  useEffect(() => {
    saveJSON(READER_SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    const controller = new AbortController();

    setChapterState({
      status: 'loading',
      verses: [],
    });

    fetchQuranJuz(rd.juz_number, controller.signal)
      .then((payload) => {
        setChapterState({
          status: 'ready',
          verses: payload.verses,
          source: payload.source,
        });

        fetchQuranJuzSupplements(rd.juz_number, controller.signal)
          .then((supplements) => {
            if (controller.signal.aborted) {
              return;
            }

            setChapterState((current) => {
              if (current.verses.length === 0) {
                return current;
              }

              const supplementsByVerseKey = new Map(supplements.verses.map((v) => [`${v.chapter_id}:${v.verse_number}`, v]));
              
              return {
                ...current,
                verses: current.verses.map(v => {
                  const s = supplementsByVerseKey.get(v.verse_key);
                  return s ? { ...v, transliteration: v.transliteration ?? s.transliteration, translation_id: v.translation_id ?? s.translation_id } : v;
                }),
              };
            });
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) {
              return;
            }

            const message =
              error instanceof Error
                ? `Teks Arab sudah tampil, tapi Latin/terjemahan belum bisa dimuat: ${error.message}`
                : 'Teks Arab sudah tampil, tapi Latin/terjemahan belum bisa dimuat.';

            setChapterState((current) => ({
              ...current,
              message: current.message ?? message,
            }));
          });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Gagal memuat data Quran.';

        setChapterState({
          status: 'error',
          verses: [],
          message,
        });
      });

    return () => controller.abort();
  }, [rd.juz_number]);

  useEffect(() => {
    if (!activeTarget || !readerReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(`ayat-${activeTarget.chapterId}-${activeTarget.verseNumber}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 90);

    return () => window.clearTimeout(timer);
  }, [activeTarget?.chapterId, activeTarget?.verseNumber, readerReady, location.pathname]);

  useEffect(() => {
    if (!infoOpen && !settingsOpen) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (settingsOpen) {
        setSettingsOpen(false);
        setLegendOpen(false);
        return;
      }

      setInfoOpen(false);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [infoOpen, settingsOpen]);

  function updateSetting<K extends keyof QuranReaderSettings>(key: K, value: QuranReaderSettings[K]) {
    setSettings((current) => normalizeReaderSettings({ ...current, [key]: value }));
  }

  function handleReaderSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetJuz = findJuz(juzQuery) ?? rd;
    const position = clampAyah(Number(ayahQuery), targetJuz.verses_count);
    const target = resolveJuzPosition(targetJuz, position);
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    setDockOpen(false);
    navigate(
      target
        ? `/quran/juz/${targetJuz.juz_number}#ayat-${target.chapterId}-${target.verseNumber}`
        : `/quran/juz/${targetJuz.juz_number}`,
    );
  }

  function handleDockLeave(event: PointerEvent<HTMLFormElement>) {
    if (event.pointerType === 'mouse') {
      setDockOpen(false);
    }
  }

  function handleJuzPlayToggle() {
    if (audioPlayer.playingVerseKey) {
      audioPlayer.togglePlayback();
      return;
    }

    const startVerse =
      (activeTarget &&
        chapterState.verses.find(
          (verse) => verse.chapter_id === activeTarget.chapterId && verse.verse_number === activeTarget.verseNumber,
        )) ??
      chapterState.verses[0];

    if (startVerse) {
      audioPlayer.playVerse(startVerse);
    }
  }

  return (
    <main
      className={styles.page}
      style={{ '--arabic-font-size': `${settings.arabicFontSize}px` } as CSSProperties}
    >
      {quranPageFontCss && <style>{quranPageFontCss}</style>}
      <div className={cx(styles.readerDock, dockOpen && styles.readerDockOpen)} aria-label="Pencarian cepat bacaan">
        <button
          type="button"
          className={styles.dockHotspot}
          aria-label="Buka pencarian surah dan ayat"
          onPointerEnter={() => setDockOpen(true)}
          onPointerDown={() => setDockOpen(true)}
          onFocus={() => setDockOpen(true)}
        />

        <form
          className={styles.readerSearchPanel}
          onSubmit={handleReaderSearch}
          onPointerEnter={() => setDockOpen(true)}
          onPointerLeave={handleDockLeave}
        >
          <button
            type="button"
            className={styles.readerSearchClose}
            aria-label="Tutup pencarian"
            onClick={() => setDockOpen(false)}
          >
            x
          </button>

          <div className={styles.readerSearchGrid}>
            <label className={styles.readerSearchField}>
              <span>Juz</span>
              <input
                list="reader-juz-options"
                value={juzQuery}
                onChange={(event) => setJuzQuery(event.target.value)}
                placeholder="Ketik nomor juz"
                autoComplete="off"
              />
            </label>

            <label className={styles.readerSearchField}>
              <span>Ayat</span>
              <input
                type="number"
                min={1}
                max={rd.verses_count}
                value={ayahQuery}
                onChange={(event) => setAyahQuery(event.target.value)}
                inputMode="numeric"
              />
            </label>

            <button type="submit" className={styles.readerSearchSubmit}>
              Buka
            </button>
          </div>

          <datalist id="reader-juz-options">
            {JUZS.map((j) => (
              <option key={j.juz_number} value={formatJuzOption(j)}>
                Juz {j.juz_number}
              </option>
            ))}
          </datalist>
        </form>
      </div>

      <div className={styles.readerTopbar}>
        <Link to="/quran" className={styles.back}>
          <span aria-hidden="true">←</span>
          Daftar Juz
        </Link>

        <nav className={styles.surahNav} aria-label="Navigasi juz">
          {prevJuz ? (
            <Link to={`/quran/juz/${prevJuz.juz_number}`} className={styles.navLink}>
              <span aria-hidden="true">‹</span>
              Juz {prevJuz.juz_number}
            </Link>
          ) : (
            <span className={styles.navDisabled}>
              <span aria-hidden="true">‹</span>
              -
            </span>
          )}
          {nextJuz ? (
            <Link to={`/quran/juz/${nextJuz.juz_number}`} className={styles.navLink}>
              Juz {nextJuz.juz_number}
              <span aria-hidden="true">›</span>
            </Link>
          ) : (
            <span className={styles.navDisabled}>
              -
              <span aria-hidden="true">›</span>
            </span>
          )}
        </nav>

        <div className={styles.topbarActions}>
          <button
            type="button"
            className={styles.settingsTrigger}
            aria-label="Buka pengaturan bacaan"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </div>

      <section className={styles.surahIntro} aria-labelledby="surah-title">
        <div className={styles.surahArabic} lang="ar" translate="no" aria-label={`Juz ${rd.juz_number}`} style={{ fontFamily: 'quran-common', fontSize: 'clamp(48px, 4vw, 64px)', textShadow: 'none', marginBottom: '0.75rem' }}>
          <span dir="ltr" aria-hidden="true">
            {`juz${String(rd.juz_number).padStart(3, '0')}`}
          </span>
        </div>
        <h1 id="surah-title" className={styles.surahName}>
          Juz {rd.juz_number}
        </h1>
        <div className={styles.surahIntroActions}>
          <button type="button" className={styles.infoTrigger} onClick={handleJuzPlayToggle} disabled={!readerReady}>
            <span aria-hidden="true">{audioPlayer.isPlaying ? '❚❚' : '▶'}</span>
            {audioPlayer.isPlaying ? 'Jeda Murottal' : 'Putar Murottal'}
          </button>
        </div>
      </section>

      {readerReady ? (
        <>
          {(chapterState.message || tajweedUnavailable || audioPlayer.error) && (
            <div className={styles.readerNotice} role="status">
              {tajweedUnavailable ? 'Tajwid warna saat ini tersedia untuk khat Utsmani.' : audioPlayer.error ?? chapterState.message}
            </div>
          )}

          <section className={styles.ayatList} aria-label={`Bacaan Juz ${rd.juz_number}`} data-source={chapterState.source}>
            {chapterState.verses.map((verse, index) => {
              const isNewSurah = verse.verse_number === 1;
              const surahInfo = isNewSurah ? SURAHS.find((s) => s.no === verse.chapter_id) : undefined;
              const isPlayingVerse = audioPlayer.playingVerseKey === verse.verse_key;

              return (
                <div key={verse.verse_key}>
                  {isNewSurah && surahInfo && (
                    <div style={{ marginTop: '2rem', marginBottom: '1rem', paddingTop: '2rem', borderTop: index !== 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <SurahHeader
                        chapterId={surahInfo.no}
                        revelationPlace={surahInfo.tempat === 'Makkiyah' ? 'Makkiyah' : 'Madaniyah'}
                        versesCount={surahInfo.ayat}
                      />
                    </div>
                  )}
                  <article
                    id={`ayat-${verse.chapter_id}-${verse.verse_number}`}
                    className={cx(
                      styles.ayatItem,
                      ((activeTarget?.chapterId === verse.chapter_id && activeTarget?.verseNumber === verse.verse_number) ||
                        isPlayingVerse) &&
                        styles.ayatItemActive,
                    )}
                    aria-current={
                      activeTarget?.chapterId === verse.chapter_id && activeTarget?.verseNumber === verse.verse_number
                        ? 'true'
                        : undefined
                    }
                  >
                    <div className={styles.ayatBody}>
                      <div className={styles.ayatToolbar}>
                        <AyahPlayButton
                          ayahNumber={verse.verse_number}
                          isActive={isPlayingVerse}
                          isPlaying={audioPlayer.isPlaying}
                          onClick={() => {
                            if (isPlayingVerse) {
                              audioPlayer.togglePlayback();
                            } else {
                              audioPlayer.playVerse(verse);
                            }
                          }}
                        />
                      </div>
                      <div className={styles.ayatArabicLine}>
                        <QuranArabic settings={settings} verse={verse} />
                      </div>
                      {settings.showLatin && verse.transliteration && <div className={styles.ayatLatin}>{verse.transliteration}</div>}
                      {settings.showTranslation && verse.translation_id && <p className={styles.ayatTranslation}>{verse.translation_id}</p>}
                    </div>
                  </article>
                </div>
              );
            })}
          </section>

          <nav className={cx(styles.surahNav, styles.readerBottomNav)} aria-label="Navigasi juz bawah">
            {prevJuz ? (
              <Link to={`/quran/juz/${prevJuz.juz_number}`} className={styles.navLink}>
                <span aria-hidden="true">‹</span>
                Juz {prevJuz.juz_number}
              </Link>
            ) : (
              <span className={styles.navDisabled}>
                <span aria-hidden="true">‹</span>
                -
              </span>
            )}
            {nextJuz ? (
              <Link to={`/quran/juz/${nextJuz.juz_number}`} className={styles.navLink}>
                Juz {nextJuz.juz_number}
                <span aria-hidden="true">›</span>
              </Link>
            ) : (
              <span className={styles.navDisabled}>
                -
                <span aria-hidden="true">›</span>
              </span>
            )}
          </nav>
        </>
      ) : (
        <section className={styles.locked}>
          <Hex width={54} height={59} bg="rgba(232,199,102,.12)" color="#E8C766" fontSize={24} fontFamily="var(--font-arabic-ui)" className={styles.lockedIcon}>
            ق
          </Hex>
          <div className={styles.lockedTitle}>{chapterState.status === 'loading' ? 'Memuat teks juz' : 'Teks juz ini belum tersedia'}</div>
          <p className={styles.lockedText}>
            {chapterState.status === 'loading'
              ? 'Mengambil data Quran dari server.'
              : chapterState.message ?? 'Pastikan koneksi internet stabil untuk memuat data resmi.'}
          </p>
          <div className={styles.lockedCta}>
            <Button to="/quran/1" variant="primary" size="md">
              Baca Al-Fatihah
            </Button>
          </div>
        </section>
      )}

      {settingsOpen && (
        <ReaderSettingsPanel
          legendClasses={tajweedClasses}
          legendOpen={legendOpen}
          onChange={updateSetting}
          onClose={() => {
            setSettingsOpen(false);
            setLegendOpen(false);
          }}
          onToggleLegend={() => setLegendOpen((open) => !open)}
          settings={settings}
        />
      )}
    </main>
  );
}

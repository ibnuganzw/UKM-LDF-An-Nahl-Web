import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Quran.module.css';
import { SURAHS } from '../data/surahs';
import { JUZS } from '../data/juzs';
import { cx } from '../lib/cx';
import { fetchQuranSearch, primeQuranSearch } from '../lib/quranSearch';
import { createHighlighter, type HighlightSegment } from '../lib/quran/highlight';
import type { QuranSearchResponse } from '../types';

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

const SEARCH_DEBOUNCE_MS = 200;
const SURAH_BY_NO = new Map(SURAHS.map((surah) => [surah.no, surah]));

function getSurahLigature(no: number): string {
  return `surah${String(no).padStart(3, '0')}`;
}

function renderSegments(segments: HighlightSegment[], markClassName: string) {
  return segments.map((seg, index) =>
    seg.match ? (
      <mark key={index} className={markClassName}>
        {seg.text}
      </mark>
    ) : (
      <span key={index}>{seg.text}</span>
    ),
  );
}

export default function Quran() {
  const [activeTab, setActiveTab] = useState<'surat' | 'juz'>('surat');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [respectVowels, setRespectVowels] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [searchResponse, setSearchResponse] = useState<QuranSearchResponse | null>(null);
  const [searchError, setSearchError] = useState('');
  const trimmedSearchQuery = searchQuery.trim();
  const controllerRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsSearchOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSearchOpen]);

  // Warm up the worker (fetch corpus + build index) as soon as the page opens so
  // the first keystroke feels instant.
  useEffect(() => {
    primeQuranSearch();
  }, []);

  useEffect(() => {
    controllerRef.current?.abort();

    if (trimmedSearchQuery.length < 2) {
      controllerRef.current = null;
      setSearchStatus('idle');
      setSearchResponse(null);
      setSearchError('');
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setSearchStatus('loading');
    setSearchError('');

    const timer = window.setTimeout(() => {
      fetchQuranSearch({
        limit: 20,
        mode: 'all',
        query: trimmedSearchQuery,
        respectVowels,
        signal: controller.signal,
      })
        .then((payload) => {
          if (controller.signal.aborted) {
            return;
          }
          setSearchResponse(payload);
          setSearchStatus('ready');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
            return;
          }
          setSearchResponse(null);
          setSearchError(error instanceof Error ? error.message : 'Gagal mencari ayat Al-Qur\'an.');
          setSearchStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedSearchQuery, respectVowels]);



  const highlighter = useMemo(() => createHighlighter(searchResponse?.query ?? ''), [searchResponse?.query]);

  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-labelledby="quran-title">
        <div className={styles.calligraphyHeader} role="img" aria-label="Kaligrafi Al-Qur'anul Karim" />

        <div className={styles.introBody}>
          <button type="button" className={styles.searchTrigger} onClick={() => setIsSearchOpen(true)}>
            <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Cari ayat...
          </button>

          <div className={styles.toolbar}>
            <div className={styles.tabs} role="tablist" aria-label="Navigasi daftar Al-Qur'an">
              <button
                type="button"
                className={activeTab === 'surat' ? styles.tabActive : styles.tab}
                role="tab"
                aria-selected={activeTab === 'surat'}
                onClick={() => setActiveTab('surat')}
              >
                Daftar Surat
                <span>{SURAHS.length}</span>
              </button>
              <button
                type="button"
                className={activeTab === 'juz' ? styles.tabActive : styles.tab}
                role="tab"
                aria-selected={activeTab === 'juz'}
                onClick={() => setActiveTab('juz')}
              >
                Daftar Juz
                <span>{JUZS.length}</span>
              </button>
            </div>
          </div>

          <div className={styles.bookmarkPlaceholder}></div>
        </div>
      </section>

      {isSearchOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsSearchOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <form className={styles.ayatSearch} onSubmit={(event) => event.preventDefault()}>
                <div className={styles.searchMain}>
                  <label className={styles.searchField}>
                    <span>Cari ayat</span>
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="alhamdulillahi rabbil alamin / jalan yang lurus"
                      autoComplete="off"
                      enterKeyHint="search"
                    />
                  </label>
                </div>

                <div className={styles.searchControls}>
                  <label className={styles.searchToggle}>
                    <input
                      type="checkbox"
                      checked={respectVowels}
                      onChange={(event) => setRespectVowels(event.target.checked)}
                    />
                    <span>Perhitungkan vokal</span>
                  </label>
                </div>
              </form>
            </div>

            {searchStatus !== 'idle' && (
              <div className={styles.modalBody} aria-live="polite" aria-label="Hasil pencarian ayat">
          {searchStatus === 'loading' && (
            <div className={styles.searchLoading}>Mencari ayat...</div>
          )}

          {searchStatus === 'error' && <div className={styles.searchError}>{searchError}</div>}

          {searchStatus === 'ready' && searchResponse && (
            <>
              {searchResponse.results.length > 0 ? (
                <div className={styles.searchResultsList}>
                  {searchResponse.results.map((result) => {
                    const surah = SURAH_BY_NO.get(result.chapter_id);
                    return (
                      <Link
                        key={result.verse_key}
                        to={`/quran/${result.chapter_id}#ayat-${result.verse_number}`}
                        className={styles.searchResultCard}
                      >
                        <div className={styles.resultTopline}>
                          <span className={styles.resultReference}>
                            {surah?.name ?? `Surah ${result.chapter_id}`} {result.verse_number}
                          </span>
                          {surah?.arti && <span className={styles.resultMeaning}>{surah.arti}</span>}
                          <span className={styles.resultScore}>{result.score}</span>
                        </div>

                        {result.text_uthmani && (
                          <div className={styles.resultArabic} dir="rtl" lang="ar" translate="no">
                            {result.text_uthmani}
                          </div>
                        )}

                        {result.transliteration && (
                          <p className={styles.resultLatin}>
                            {result.matched_fields.includes('lafaz')
                              ? renderSegments(highlighter.lafaz(result.transliteration), styles.resultMark)
                              : result.transliteration}
                          </p>
                        )}
                        {result.translation_id && (
                          <p className={styles.resultTranslation}>
                            {result.matched_fields.includes('translation')
                              ? renderSegments(highlighter.translation(result.translation_id), styles.resultMark)
                              : result.translation_id}
                          </p>
                        )}

                        <div className={styles.resultFields}>
                          {result.matched_fields.map((field) => (
                            <span key={field}>{field === 'arabic' ? 'Arab' : field === 'lafaz' ? 'Lafaz' : 'Terjemah'}</span>
                          ))}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.searchEmpty}>Belum ada ayat yang cocok.</div>
              )}
            </>
          )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'surat' && (
        <section className={styles.surahGrid} aria-label="Daftar surat Al-Qur'an">
          {SURAHS.map((s) => (
            <Link key={s.no} to={`/quran/${s.no}`} className={cx(styles.surahCard, s.special && styles.surahCardSpecial)}>
              <span className={styles.surahNumber}>{s.no}</span>
              <div className={styles.surahArabic} lang="ar" aria-label={s.ar}>
                <span dir="ltr" aria-hidden="true">
                  {getSurahLigature(s.no)}
                </span>
              </div>
              <h2 className={styles.surahName}>{s.name}</h2>
              <div className={styles.surahMeta}>
                <span>{s.arti}</span>
                <span aria-hidden="true">·</span>
                <span>{s.ayat} ayat</span>
                <span aria-hidden="true">·</span>
                <span>{s.tempat}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {activeTab === 'juz' && (
        <section className={styles.surahGrid} aria-label="Daftar juz Al-Qur'an">
          {JUZS.map((j) => {
            const surahKeys = Object.keys(j.verse_mapping);
            const startSurahNo = surahKeys[0];
            const startAyatNo = j.verse_mapping[startSurahNo].split('-')[0];
            const startSurah = SURAH_BY_NO.get(Number(startSurahNo));
            
            const endSurahNo = surahKeys[surahKeys.length - 1];
            const endAyatRange = j.verse_mapping[endSurahNo].split('-');
            const endAyatNo = endAyatRange[endAyatRange.length - 1];
            const endSurah = SURAH_BY_NO.get(Number(endSurahNo));
            
            return (
              <Link key={j.juz_number} to={`/quran/juz/${j.juz_number}`} className={styles.surahCard}>
                <span className={styles.surahNumber}>{j.juz_number}</span>
                <div className={styles.surahArabic} lang="ar" aria-label={`Juz ${j.juz_number}`} style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                  <span dir="rtl">
                    الجزء {Intl.NumberFormat('ar-EG').format(j.juz_number)}
                  </span>
                </div>
                <h2 className={styles.surahName}>Juz {j.juz_number}</h2>
                <div className={styles.surahMeaning} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', lineHeight: 1.3, marginTop: '4px' }}>
                  <span style={{ opacity: 0.9 }}>
                    {startSurahNo === endSurahNo 
                      ? `${startSurah?.name} ayat ${startAyatNo} - ${endAyatNo}`
                      : `${startSurah?.name} ayat ${startAyatNo} - ${endSurah?.name} ayat ${endAyatNo}`}
                  </span>
                  <span style={{ opacity: 0.75 }}>{j.verses_count} ayat</span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

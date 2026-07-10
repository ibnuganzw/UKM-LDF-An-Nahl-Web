import { useRef, useState, type KeyboardEvent } from 'react';
import styles from './SurahInfoDialog.module.css';
import { Badge, Hex } from './ui';
import { cx } from '../lib/cx';
import type { Surah, SurahInfo, SurahInfoStruktur } from '../types';

interface SurahInfoDialogProps {
  surah: Surah;
  info?: SurahInfo;
  revelationPlace: string;
  onClose: () => void;
}

type TabId = 'ringkasan' | 'konteks' | 'kandungan' | 'hikmah';

const TABS: { id: TabId; label: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'konteks', label: 'Konteks' },
  { id: 'kandungan', label: 'Kandungan' },
  { id: 'hikmah', label: 'Hikmah' },
];

function formatJuz(juz: SurahInfo['juz']): string {
  return juz.dari === juz.sampai ? `Juz ${juz.dari}` : `Juz ${juz.dari}–${juz.sampai}`;
}

function parseRange(rentang: string): [number, number] {
  const nums = [...rentang.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (nums.length === 0) return [0, 0];
  return [Math.min(...nums), Math.max(...nums)];
}

function computeSegmentWidths(segments: SurahInfoStruktur[]): number[] {
  const spans = segments.map((seg) => {
    const [start, end] = parseRange(seg.rentang);
    return Math.max(end - start + 1, 1);
  });
  const total = spans.reduce((sum, span) => sum + span, 0) || 1;
  return spans.map((span) => (span / total) * 100);
}

export function SurahInfoDialog({ surah, info, revelationPlace, onClose }: SurahInfoDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + delta + TABS.length) % TABS.length;
    setActiveTab(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="surah-info-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="surah-info-title">Tentang Surah ini</h2>
          <button type="button" className={styles.close} aria-label="Tutup informasi surat" onClick={onClose}>
            x
          </button>
        </div>

        <div className={styles.hero}>
          <div className={styles.heroArabic} dir="rtl" lang="ar" translate="no">
            {surah.ar}
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.heroName}>Surah {surah.name}</div>
            <div className={styles.heroFacts}>
              <span>{surah.ayat} Ayat</span>
              <span>
                {revelationPlace}
                {info?.tempatTurunCatatan ? ' · diperselisihkan' : ''}
              </span>
              {info && <span>{formatJuz(info.juz)}</span>}
              {info && <span>Wahyu ke-{info.urutanTurun}</span>}
            </div>
            {info && info.namaLain.length > 0 && (
              <div className={styles.heroAliases}>
                {info.namaLain.map((name) => (
                  <Badge key={name} color="#E8C766" uppercase={false}>
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {!info ? (
          <p className={styles.emptyState}>Informasi mendalam untuk surah ini belum tersedia.</p>
        ) : (
          <>
            <div role="tablist" aria-label="Bagian informasi surah" className={styles.tabList}>
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`surah-info-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`surah-info-panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={cx(styles.tab, activeTab === tab.id && styles.tabActive)}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              id={`surah-info-panel-${activeTab}`}
              aria-labelledby={`surah-info-tab-${activeTab}`}
              className={styles.tabPanel}
              tabIndex={0}
            >
              {activeTab === 'ringkasan' && (
                <div className={styles.section}>
                  <p className={styles.pullQuote}>{info.ringkasanSingkat}</p>
                  <p className={styles.paragraph}>{info.temaUtama}</p>
                </div>
              )}

              {activeTab === 'konteks' && (
                <div className={styles.section}>
                  <SubSection label="Asal Nama" text={info.alasanPenamaan} />
                  <SubSection label="Latar Turunnya" text={info.konteksTurun} />
                  <SubSection label="Sebab Turun" text={info.asbabunNuzul} />
                  <SubSection label="Keterkaitan Antar-Surat" text={info.munasabah} />
                </div>
              )}

              {activeTab === 'kandungan' && (
                <div className={styles.section}>
                  {info.strukturSurat.length > 0 && <StructureMap segments={info.strukturSurat} />}

                  {info.gambaranIsi.length > 0 && (
                    <div className={styles.subBlock}>
                      <div className={styles.eyebrow}>Peta Ayat</div>
                      <ul className={styles.verseMapList}>
                        {info.gambaranIsi.map((item) => (
                          <li key={item.rentang} className={styles.verseMapItem}>
                            <span className={styles.verseMapRange}>{item.rentang}</span>
                            <span className={styles.verseMapText}>{item.fokus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {info.pokokKandungan.length > 0 && (
                    <div className={styles.subBlock}>
                      <div className={styles.eyebrow}>Pokok Kandungan</div>
                      <div className={styles.kandunganGrid}>
                        {info.pokokKandungan.map((item) => (
                          <div key={item.kategori} className={styles.kandunganCard}>
                            <Badge color="#5CCBA0">{item.kategori}</Badge>
                            <p>{item.isi}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {info.ayatKunci.length > 0 && (
                    <div className={styles.subBlock}>
                      <div className={styles.eyebrow}>Ayat Kunci</div>
                      <div className={styles.verseCardList}>
                        {info.ayatKunci.map((item) => (
                          <div key={item.ayat} className={styles.verseCard}>
                            <Hex
                              width={44}
                              height={50}
                              bg="rgba(232, 199, 102, .14)"
                              color="#E8C766"
                              fontSize={12}
                              fontFamily="var(--font-sans)"
                              className={styles.verseCardHex}
                            >
                              {item.ayat.replace(/^Ayat\s*/i, '')}
                            </Hex>
                            <div className={styles.verseCardBody}>
                              <p className={styles.verseCardMakna}>{item.makna}</p>
                              {item.catatan && <p className={styles.verseCardCatatan}>{item.catatan}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'hikmah' && (
                <div className={styles.section}>
                  <SubSection label="Keutamaan" text={info.keutamaan} />
                  <SubSection label="Fakta Menarik" text={info.faktaMenarik} />
                  {info.pesanPraktis && <p className={styles.pullQuote}>{info.pesanPraktis}</p>}
                  {info.pertanyaanTadabbur && (
                    <div className={styles.tadabburBox}>
                      <div className={styles.eyebrow}>Renungkan</div>
                      <p>{info.pertanyaanTadabbur}</p>
                    </div>
                  )}
                  {info.catatanIkhtilaf && (
                    <div className={styles.caution}>
                      <div className={styles.eyebrow}>Catatan Kehati-hatian</div>
                      <p>{info.catatanIkhtilaf}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {info.sumberRujukan.length > 0 && <p className={styles.sources}>Rujukan: {info.sumberRujukan.join(', ')}</p>}
          </>
        )}
      </section>
    </div>
  );
}

function SubSection({ label, text }: { label: string; text: string }) {
  if (!text) {
    return null;
  }

  return (
    <div className={styles.subBlock}>
      <div className={styles.eyebrow}>{label}</div>
      <p className={styles.paragraph}>{text}</p>
    </div>
  );
}

function StructureMap({ segments }: { segments: SurahInfoStruktur[] }) {
  const [active, setActive] = useState(0);
  const widths = computeSegmentWidths(segments);
  const current = segments[active];

  return (
    <div className={styles.subBlock}>
      <div className={styles.eyebrow}>Struktur Surat</div>
      <div className={styles.structureBar} role="tablist" aria-label="Bagian struktur surat">
        {segments.map((seg, index) => (
          <button
            key={seg.bagian}
            type="button"
            role="tab"
            title={seg.bagian}
            aria-selected={active === index}
            className={cx(styles.structureSegment, active === index && styles.structureSegmentActive)}
            style={{ width: `${widths[index]}%` }}
            onClick={() => setActive(index)}
          >
            <span>{seg.bagian}</span>
          </button>
        ))}
      </div>
      <div className={styles.structureDetail}>
        <div className={styles.structureDetailHead}>
          <span className={styles.structureRange}>Ayat {current.rentang}</span>
          <span className={styles.structureTema}>{current.tema}</span>
        </div>
        <p>{current.keterkaitan}</p>
      </div>
    </div>
  );
}

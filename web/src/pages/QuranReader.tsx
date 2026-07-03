import { Link, useParams } from 'react-router-dom';
import styles from './QuranReader.module.css';
import { Button, GlassCard, Hex } from '../components/ui';
import { AL_FATIHAH, SURAHS } from '../data/surahs';
import { cx } from '../lib/cx';

export default function QuranReader() {
  const { no } = useParams<{ no: string }>();
  const rd = SURAHS.find((s) => s.no === Number(no)) ?? SURAHS[0];

  return (
    <div className={styles.page}>
      <Link to="/quran" className={styles.back}>← Daftar surah</Link>

      <GlassCard
        variant="featured"
        radius={26}
        borderColor="rgba(232,199,102,.32)"
        background="linear-gradient(150deg,rgba(201,162,39,.16),rgba(255,255,255,.04))"
        padding="34px 28px"
        className={styles.headerPanel}
      >
        <div className={styles.headerHex} />
        <div className={cx('breath', styles.headerGlow)} />
        <div className={styles.headerContent}>
          <div className={styles.headerArabic} dir="rtl">سُورَةُ {rd.ar}</div>
          <div className={styles.headerName}>{rd.name}</div>
          <div className={styles.headerMeta}>{rd.arti} · {rd.ayat} ayat · {rd.tempat}</div>
        </div>
      </GlassCard>

      {rd.ready ? (
        <>
          <div className={styles.ayatList}>
            {AL_FATIHAH.map((y) => (
              <GlassCard key={y.n} radius={22} borderColor="rgba(232,199,102,.14)" className={styles.ayatCard}>
                <div dir="rtl" className={styles.ayatArabic}>
                  {y.ar} <span className={styles.ayatMarker}>{y.n}</span>
                </div>
                <div className={styles.ayatDivider}>{y.id}</div>
              </GlassCard>
            ))}
          </div>
          <div className={styles.readerNote}>Teks Arab & terjemahan ayat di atas asli. Terjemahan final akan mengikuti terjemahan resmi Kemenag RI.</div>
        </>
      ) : (
        <div className={styles.locked}>
          <Hex width={54} height={59} bg="rgba(232,199,102,.12)" color="#E8C766" fontSize={24} fontFamily="Amiri, serif" className={styles.lockedIcon}>
            ق
          </Hex>
          <div className={styles.lockedTitle}>Teks surah ini belum dimuat</div>
          <p className={styles.lockedText}>
            Pada prototype ini hanya Al-Fatihah yang ditampilkan sebagai contoh. Di versi penuh, seluruh mushaf
            terhubung ke sumber resmi — tanpa teks karangan.
          </p>
          <div className={styles.lockedCta}>
            <Button to="/quran/1" variant="primary" size="md">Baca Al-Fatihah</Button>
          </div>
        </div>
      )}
    </div>
  );
}

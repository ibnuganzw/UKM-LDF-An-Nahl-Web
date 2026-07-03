import styles from './Quran.module.css';
import { Badge, DashedNote, GlassCard, Hex } from '../components/ui';
import { SURAHS } from '../data/surahs';

export default function Quran() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.arabicTitle} dir="rtl">القُرْآنُ الكَرِيمُ</div>
        <h1 className={styles.h1}>Al-Qur'anul Karim</h1>
        <p className={styles.lead}>Ruang baca yang lapang dan tenang. Pilih surah untuk mulai membaca.</p>
      </div>

      <div className={styles.list}>
        {SURAHS.map((s) => (
          <GlassCard
            key={s.no}
            to={`/quran/${s.no}`}
            hover
            radius={20}
            padding="16px 20px"
            variant={s.special ? 'featured' : 'default'}
            background={s.special ? 'linear-gradient(120deg,rgba(232,199,102,.14),rgba(255,255,255,.03))' : undefined}
            borderColor={s.special ? 'rgba(232,199,102,.45)' : 'rgba(232,199,102,.16)'}
            className={styles.row}
          >
            <Hex width={42} height={46} bg="rgba(232,199,102,.12)" color="#E8C766" fontSize={14}>{s.no}</Hex>
            <div className={styles.rowMain}>
              <div className={styles.rowNameLine}>
                <span className={styles.rowName}>{s.name}</span>
                {s.special && (
                  <Badge color="#E8C766" background="rgba(232,199,102,.12)" border="rgba(232,199,102,.3)" style={{ fontSize: 10, padding: '3px 10px' }}>
                    Surah kami
                  </Badge>
                )}
              </div>
              <div className={styles.rowMeta}>{s.arti} · {s.ayat} ayat · {s.tempat}</div>
            </div>
            <div className={styles.rowArabic} dir="rtl">{s.ar}</div>
          </GlassCard>
        ))}
      </div>

      <DashedNote className={styles.note}>
        Daftar 114 surah lengkap dengan teks resmi akan dihubungkan ke sumber mushaf digital resmi (mis. Kemenag / KFGQPC) pada versi penuh.
      </DashedNote>
    </div>
  );
}

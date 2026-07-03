import styles from './Shalat.module.css';
import { GlassCard, Hex } from '../components/ui';
import { useNow } from '../hooks/useNow';
import { PRAYER_TIMES, getNextPrayer } from '../lib/prayer';
import { formatFullDate } from '../lib/dates';
import { HIJRI_STR, KOTA } from '../config';
import { cx } from '../lib/cx';

export default function Shalat() {
  const now = useNow();
  const prayer = getNextPrayer(now);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>Waktu Shalat</div>
        <h1 className={styles.dateHeading}>{formatFullDate(now)}</h1>
        <div className={styles.subLine}>{HIJRI_STR} · {KOTA}</div>
      </div>

      <GlassCard
        variant="featured"
        radius={28}
        borderColor="rgba(232,199,102,.32)"
        background="linear-gradient(150deg,rgba(201,162,39,.16),rgba(255,255,255,.04))"
        padding="38px 28px"
        className={styles.panel}
      >
        <div className={styles.panelHex1} />
        <div className={styles.panelHex2} />
        <div className={cx('breath', styles.panelGlow)} />
        <div className={styles.panelContent}>
          <div className={styles.panelLabel}>Shalat berikutnya</div>
          <div className={styles.prayerName}>{prayer.name}</div>
          <div className={styles.prayerTime}>{prayer.time} WIB</div>
          <div className={cx('cdGlow', styles.countdownPill)}>− {prayer.countdown}</div>
        </div>
      </GlassCard>

      <GlassCard radius={24} padding="0" className={styles.listPanel}>
        {PRAYER_TIMES.map((p, i) => {
          const active = i === prayer.index;
          return (
            <div key={p.name} className={styles.row} style={{ background: active ? 'rgba(232,199,102,.1)' : 'transparent' }}>
              <div className={styles.rowLeft}>
                <Hex width={9} height={10} bg={active ? '#E8C766' : 'rgba(255,255,255,.2)'} />
                <span className={styles.rowName} style={{ color: active ? '#F5EFDC' : '#A9B3D1' }}>{p.name}</span>
                {i === 1 && <span className={styles.rowNote}>terbit</span>}
              </div>
              <span className={styles.rowTime} style={{ color: active ? '#F5EFDC' : '#A9B3D1' }}>{p.time}</span>
            </div>
          );
        })}
      </GlassCard>

      <div className={styles.disclaimer}>Jadwal contoh. Pada versi penuh akan terhubung ke sumber jadwal shalat resmi sesuai lokasi.</div>

      <div className={styles.quoteCard}>
        <div className={styles.quoteText}>"Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar."</div>
        <div className={styles.quoteCite}>QS. AL-'ANKABUT : 45</div>
      </div>
    </div>
  );
}

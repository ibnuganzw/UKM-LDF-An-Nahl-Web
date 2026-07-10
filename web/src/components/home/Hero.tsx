import { useState, useEffect, type CSSProperties } from 'react';
import styles from './Hero.module.css';
import { Button } from '../ui';
import { cx } from '../../lib/cx';

interface BeeProps {
  className: string;
  style: CSSProperties;
  wings: CSSProperties[];
}

function Bee({ className, style, wings }: BeeProps) {
  return (
    <span className={cx(styles.bee, className)} style={style}>
      <span className={styles.beeBody} />
      {wings.map((wingStyle, i) => (
        <span key={i} className={styles.beeWing} style={wingStyle} />
      ))}
    </span>
  );
}

const HEX_BACKDROPS: CSSProperties[] = [
  { top: -8, left: 34, background: 'rgba(232,199,102,.10)' },
  { top: -8, left: 190, background: 'rgba(232,199,102,.05)' },
  { top: 120, left: 112, background: 'rgba(232,199,102,.14)' },
  { top: 120, left: -44, background: 'rgba(232,199,102,.04)' },
];

const ISLAMIC_HOLIDAYS_2026 = [
  { name: 'Isra Mikraj', date: new Date('2026-01-16T00:00:00').getTime() },
  { name: 'Nisfu Sya\'ban', date: new Date('2026-02-03T00:00:00').getTime() },
  { name: '1 Ramadhan 1447 H', date: new Date('2026-02-19T00:00:00').getTime() },
  { name: 'Nuzulul Qur\'an', date: new Date('2026-03-07T00:00:00').getTime() },
  { name: 'Idul Fitri 1447 H', date: new Date('2026-03-21T00:00:00').getTime() },
  { name: 'Hari Arafah', date: new Date('2026-05-26T00:00:00').getTime() },
  { name: 'Idul Adha 1447 H', date: new Date('2026-05-27T00:00:00').getTime() },
  { name: 'Tahun Baru Islam 1448 H', date: new Date('2026-06-16T00:00:00').getTime() },
  { name: 'Maulid Nabi SAW', date: new Date('2026-08-25T00:00:00').getTime() },
];

function getNextHoliday() {
  const now = Date.now();
  return ISLAMIC_HOLIDAYS_2026.find(h => h.date > now) || ISLAMIC_HOLIDAYS_2026[ISLAMIC_HOLIDAYS_2026.length - 1];
}

export interface HeroProps {
  nextPrayerName: string;
  nextPrayerTime: string;
}

export function Hero({ nextPrayerName, nextPrayerTime }: HeroProps) {
  const [countdown, setCountdown] = useState('');
  const [holidayName, setHolidayName] = useState('Hari Raya Islam');

  useEffect(() => {
    const updateCountdown = () => {
      const nextHoliday = getNextHoliday();
      setHolidayName(nextHoliday.name);
      
      const diff = nextHoliday.date - Date.now();
      if (diff <= 0) {
        setCountdown('Hari Ini!');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setCountdown(`${days} hari ${hours} jam lagi`);
      } else if (hours > 0) {
        setCountdown(`${hours} jam ${mins} mnt lagi`);
      } else {
        setCountdown(`${mins} mnt lagi`);
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.textureOverlay} />
      <div className={cx('breath', styles.glowTop)} />
      <div className={cx('breathB', styles.glowBottom)} />

      <div className={styles.inner}>
        <div className={styles.textCol}>
          <div className={styles.eyebrow}>
            <span className={styles.star} />
            <span className={styles.eyebrowLabel}>Lembaga Dakwah Fakultas · FKH USK</span>
          </div>
          <h1 className={styles.heading}>
            Serdadu Lebah,
            <br />
            Bersenjata <em className={styles.headingEm}>Dakwah.</em>
          </h1>
          <p className={styles.lead}>
            Dari mushalla FKH Universitas Syiah Kuala — menghidupkan kajian, merawat ukhuwah, dan menebar ilmu yang
            bermanfaat bagi kampus dan umat.
          </p>
          <div className={styles.ctaRow}>
            <Button to="/agenda" variant="primary">Lihat Agenda</Button>
            <Button to="/profil" variant="secondary">Kenali An-Nahl</Button>
          </div>
        </div>

        <div className={styles.visualCol}>
          {HEX_BACKDROPS.map((s, i) => (
            <div key={i} className={styles.hexBackdrop} style={s} />
          ))}
          <div className={cx('breath', styles.logoGlow)} />
          <img src="/assets/logo.png" alt="Logo LDF An-Nahl" className={cx('lfloat', styles.logo)} />

          <Bee
            className="beeA"
            style={{ top: '12%', left: '8%', width: 22, height: 13, opacity: .75 }}
            wings={[
              { top: -6, left: 5, width: 8, height: 8, background: 'rgba(245,239,220,.4)' },
              { top: -4, left: 11, width: 6, height: 6, background: 'rgba(245,239,220,.3)' },
            ]}
          />
          <Bee
            className="beeB"
            style={{ top: '70%', right: '4%', width: 18, height: 11, opacity: .6 }}
            wings={[{ top: -5, left: 4, width: 7, height: 7, background: 'rgba(245,239,220,.35)' }]}
          />
          <Bee
            className="beeC"
            style={{ top: '4%', right: '18%', width: 14, height: 9, opacity: .5 }}
            wings={[{ top: -4, left: 3, width: 6, height: 6, background: 'rgba(245,239,220,.35)' }]}
          />

          <div className={cx('chipF', styles.chip)} style={{ top: 6, right: -6 }}>
            <div className={styles.chipLabel}>Shalat berikutnya</div>
            <div className={styles.chipValue}>{nextPrayerName} · {nextPrayerTime}</div>
          </div>
          <div className={cx('chipF2', styles.chip)} style={{ bottom: 18, left: -14 }}>
            <div className={styles.chipLabel}>Menuju {holidayName}</div>
            <div className={styles.chipValue}>{countdown || '...'}</div>
          </div>
        </div>
      </div>

      <div className={styles.horizonWrap}>
        <div className={styles.silhouette}>
          <div className={styles.dome} />
          <div className={styles.domeBase} />
          <div className={styles.minaretTallL} />
          <div className={styles.minaretTallR} />
          <div className={styles.minaretShortL} />
          <div className={styles.minaretShortR} />
        </div>
      </div>
      <div className={styles.baseline} />
    </section>
  );
}

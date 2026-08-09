import { useState, useEffect, type CSSProperties } from 'react';
import styles from './Hero.module.css';
import { Button } from '../ui';
import { cx } from '../../lib/cx';
import { getIslamicHolidayCountdown } from '../../lib/islamicCalendar';

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

export interface HeroProps {
  nextPrayerName: string;
  nextPrayerTime: string;
}

export function Hero({ nextPrayerName, nextPrayerTime }: HeroProps) {
  const [countdown, setCountdown] = useState('');
  const [holidayName, setHolidayName] = useState('Hari Raya Islam');

  useEffect(() => {
    const updateCountdown = () => {
      const nextHoliday = getIslamicHolidayCountdown(new Date());
      setHolidayName(nextHoliday.name);
      setCountdown(nextHoliday.countdown);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <picture className={styles.photo}>
        <source
          media="(max-width: 640px)"
          srcSet="/assets/photos/hero-mushalla-mobile-v1.jpg"
        />
        <img
          src="/assets/photos/hero-mushalla-desktop-v1.jpg"
          alt="Mushalla Fakultas Kedokteran Hewan Universitas Syiah Kuala"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      <div className={styles.photoWash} />

      <div className={styles.inner}>
        <div className={styles.floaters} aria-hidden="true">
          <div className={cx('breath', styles.glowTop)} />

          <Bee
            className="beeA"
            style={{ top: '2%', right: '30%', width: 26, height: 15, opacity: .8 }}
            wings={[
              { top: -7, left: 6, width: 9, height: 9, background: 'rgba(245,239,220,.42)' },
              { top: -5, left: 13, width: 7, height: 7, background: 'rgba(245,239,220,.32)' },
            ]}
          />
          <Bee
            className="beeB"
            style={{ top: '48%', right: '-1%', width: 20, height: 12, opacity: .65 }}
            wings={[{ top: -5, left: 4, width: 7, height: 7, background: 'rgba(245,239,220,.36)' }]}
          />
          <Bee
            className="beeC"
            style={{ top: '18%', right: '2%', width: 16, height: 10, opacity: .55 }}
            wings={[{ top: -4, left: 3, width: 6, height: 6, background: 'rgba(245,239,220,.36)' }]}
          />

          <div className={cx(styles.floater, styles.prayerFloater)}>
            <div className={cx('chipF', styles.chip)}>
              <div className={styles.chipLabel}>Shalat berikutnya</div>
              <div className={styles.chipValue}>{nextPrayerName} · {nextPrayerTime}</div>
            </div>
          </div>
          <div className={cx(styles.floater, styles.floaterLate, styles.holidayFloater)}>
            <div className={cx('chipF2', styles.chip)}>
              <div className={styles.chipLabel}>Menuju {holidayName}</div>
              <div className={styles.chipValue}>{countdown || '...'}</div>
            </div>
          </div>
        </div>

        <div className={styles.textCol}>
          <div className={styles.kicker}>
            <span className={styles.kickerLine} aria-hidden="true" />
            <span>LDF An-Nahl · FKH USK</span>
          </div>

          <h1 id="home-hero-title" className={styles.heading}>
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
      </div>

      <div className={styles.photoCaption}>Mushalla FKH USK</div>
    </section>
  );
}

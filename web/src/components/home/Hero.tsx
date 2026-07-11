import styles from './Hero.module.css';
import { Button } from '../ui';

export function Hero() {
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
        />
      </picture>

      <div className={styles.photoWash} />

      <div className={styles.inner}>
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

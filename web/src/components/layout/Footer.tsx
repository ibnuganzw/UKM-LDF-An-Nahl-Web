import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <div className={styles.brandRow}>
            <img src="/assets/logo.png" alt="Logo" className={styles.logo} />
            <div>
              <div className={styles.brandName}>LDF An-Nahl</div>
              <div className={styles.brandSub}>FKH USK</div>
            </div>
          </div>
          <div className={styles.tagline}>Serdadu Lebah, Bersenjata Dakwah.</div>
        </div>

        <div className={styles.cols}>
          <div className={styles.col}>
            <div className={styles.colHead}>Jelajah</div>
            <Link to="/agenda" className={styles.colLink}>Agenda</Link>
            <Link to="/quran" className={styles.colLink}>Al-Qur'an</Link>
            <Link to="/shalat" className={styles.colLink}>Waktu Shalat</Link>
            <Link to="/konten" className={styles.colLink}>Tulisan</Link>
          </div>
          <div className={styles.col}>
            <div className={styles.colHead}>Organisasi</div>
            <Link to="/profil" className={styles.colLink}>Profil & Struktur</Link>
            <Link to="/register" className={styles.colLink}>Daftar Anggota</Link>
            <Link to="/login" className={styles.colLink}>Masuk</Link>
          </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <span>© 1448 H / 2026 LDF An-Nahl · Fakultas Kedokteran Hewan USK</span>
          <span>Prototype v2</span>
        </div>
      </div>

      <div className={styles.mobileSpacer} />
    </footer>
  );
}

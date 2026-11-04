import { Link } from 'react-router-dom';
import styles from './FocusedHeader.module.css';
import { ThemeToggle } from '../ui';

export function FocusedHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="LDF An-Nahl — kembali ke Beranda">
          <img
            src="/assets/logo-96.jpg"
            srcSet="/assets/logo-96.jpg 1x, /assets/logo-192.jpg 2x"
            width="38"
            height="38"
            alt=""
            className={styles.logo}
            decoding="async"
          />
          <span>
            <strong>LDF An-Nahl</strong>
            <small>FKH USK</small>
          </span>
        </Link>
        <div className={styles.actions}>
          <ThemeToggle compact />
        </div>
      </div>
    </header>
  );
}

import { useEffect } from 'react';
import styles from './NotFound.module.css';
import { Button } from '../components/ui';
import { setPageSeo } from '../lib/seo';

export default function NotFound() {
  useEffect(() => {
    setPageSeo({
      title: 'Halaman Tidak Ditemukan',
      description: 'Halaman yang diminta tidak ditemukan.',
      noIndex: true,
    });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none">
          <path
            d="M20 9h24l13 23-13 23H20L7 32Z"
            stroke="rgba(232,199,102,.5)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M37.5 19.5a13.5 13.5 0 1 0 0 25 11 11 0 0 1 0-25Z" fill="rgba(232,199,102,.4)" />
        </svg>
      </div>
      <div className={styles.eyebrow}>404 · Tidak ditemukan</div>
      <h1 className={styles.heading}>Halaman ini tersesat dari sarang.</h1>
      <p className={styles.lead}>
        Alamat yang kamu tuju tidak ada di situs ini — mungkin sudah dipindahkan, atau tautannya keliru.
      </p>
      <div className={styles.ctaRow}>
        <Button to="/" variant="primary">Kembali ke Beranda</Button>
        <Button to="/agenda" variant="secondary">Lihat Agenda</Button>
      </div>
    </div>
  );
}

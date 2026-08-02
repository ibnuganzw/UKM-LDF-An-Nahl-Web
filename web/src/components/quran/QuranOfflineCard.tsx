import { useEffect, useRef, useState } from 'react';
import {
  clearQuranOfflinePack,
  downloadQuranOfflinePack,
  getQuranOfflineStatus,
  QURAN_OFFLINE_URLS,
  type QuranOfflineStatus,
} from '../../lib/pwa';
import styles from './QuranOfflineCard.module.css';

const INITIAL_STATUS: QuranOfflineStatus = { available: true, cached: 0, total: QURAN_OFFLINE_URLS.length, complete: false };

export function QuranOfflineCard() {
  const [status, setStatus] = useState<QuranOfflineStatus>(INITIAL_STATUS);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void getQuranOfflineStatus().then(setStatus).catch(() => setStatus({ ...INITIAL_STATUS, available: false }));
    return () => abortRef.current?.abort();
  }, []);

  const download = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setDownloading(true);
    setError('');
    try {
      await Promise.all([
        import('../../pages/QuranReader'),
        import('../../pages/JuzReader'),
      ]);
      const next = await downloadQuranOfflinePack((cached, total) => {
        setStatus({ available: true, cached, total, complete: cached >= total });
      }, controller.signal);
      setStatus(next);
    } catch (reason) {
      if ((reason as Error).name !== 'AbortError') setError('Paket offline belum selesai. Coba lagi saat koneksi stabil.');
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  };

  const clear = async () => {
    setError('');
    setStatus(await clearQuranOfflinePack());
  };

  const percent = Math.round((status.cached / Math.max(status.total, 1)) * 100);
  return (
    <article className={styles.card} aria-labelledby="offline-quran-title">
      <div>
        <span className={styles.eyebrow}>Akses tanpa jaringan</span>
        <h2 id="offline-quran-title">Paket Quran offline</h2>
        <p>
          {status.complete
            ? 'Teks 114 surah, terjemah, tajwid, dan indeks pencarian siap dibaca tanpa internet.'
            : 'Unduh sekitar 10 MB sekali untuk menyiapkan seluruh teks Quran di perangkat ini.'}
        </p>
      </div>
      <div className={styles.actions}>
        <span className={styles.progress}>{status.complete ? 'Siap offline' : downloading ? `${percent}%` : `${status.cached}/${status.total}`}</span>
        {status.complete ? (
          <button type="button" onClick={() => void clear()}>Hapus paket</button>
        ) : (
          <button type="button" onClick={() => void download()} disabled={downloading || !status.available}>
            {downloading ? 'Mengunduh…' : 'Siapkan offline'}
          </button>
        )}
      </div>
      {downloading && <progress className={styles.progressBar} value={status.cached} max={status.total} aria-label={`Unduhan Quran offline ${percent}%`} />}
      {error && <p className={styles.error} role="status">{error}</p>}
    </article>
  );
}

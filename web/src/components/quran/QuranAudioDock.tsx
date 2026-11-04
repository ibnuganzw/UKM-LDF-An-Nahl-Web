import { Link } from 'react-router-dom';
import { getReciter } from '../../lib/quranAudio';
import { useQuranAudio } from '../../state/QuranAudioContext';
import { cx } from '../../lib/cx';
import styles from './QuranAudioDock.module.css';

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function QuranAudioDock({ mobileChromeVisible = true }: { mobileChromeVisible?: boolean }) {
  const audio = useQuranAudio();
  if (!audio.currentVerse) return null;
  const reciter = getReciter(audio.reciterId);

  return (
    <aside className={cx(styles.dock, !mobileChromeVisible && styles.mobileChromeHidden)} aria-label="Pemutar murottal persisten">
      <div className={styles.identity}>
        <span className={styles.pulse} aria-hidden="true" />
        <Link to={audio.currentHref} className={styles.track}>
          <strong>{audio.sourceTitle} · Ayat {audio.currentVerse.verse_number}</strong>
          <span>{reciter.name}</span>
        </Link>
      </div>

      <div className={styles.controls}>
        <button type="button" aria-label="Ayat sebelumnya" onClick={audio.previous}>‹</button>
        <button type="button" className={styles.play} aria-label={audio.isPlaying ? 'Jeda murottal' : 'Lanjutkan murottal'} onClick={audio.togglePlayback}>
          {audio.isPlaying ? '❚❚' : '▶'}
        </button>
        <button type="button" aria-label="Ayat berikutnya" onClick={audio.next}>›</button>
      </div>

      <div className={styles.timeline}>
        <span>{formatTime(audio.currentTime)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(audio.duration, 1)}
          value={Math.min(audio.currentTime, Math.max(audio.duration, 1))}
          aria-label="Posisi audio"
          onChange={(event) => audio.seek(Number(event.target.value))}
        />
        <span>{formatTime(audio.duration)}</span>
      </div>

      {audio.error && <span className={styles.error}>{audio.error}</span>}
      <button type="button" className={styles.close} aria-label="Tutup pemutar murottal" onClick={audio.stop}>×</button>
    </aside>
  );
}

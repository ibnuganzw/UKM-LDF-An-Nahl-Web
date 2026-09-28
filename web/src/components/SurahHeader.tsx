import styles from './SurahHeader.module.css';
import { cx } from '../lib/cx';
import { isRevelationPlaceDisputed } from '../lib/surahEditorial';

interface SurahHeaderProps {
  chapterId: number;
  revelationPlace: 'Makkiyah' | 'Madaniyah';
  versesCount: number;
}

function getSurahLigature(chapterId: number): string {
  return `surah${String(chapterId).padStart(3, '0')}`;
}

export function SurahHeader({ chapterId, revelationPlace, versesCount }: SurahHeaderProps) {
  const isMakki = revelationPlace === 'Makkiyah';
  const placeDisputed = isRevelationPlaceDisputed(chapterId);

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame} aria-label={`Surah ${chapterId}`}>
        <span className={styles.frameGlyph} aria-hidden="true" translate="no">
          surah_header
        </span>

        <div className={styles.frameContent}>
          <div className={styles.placeSlot}>
            <span
              className={cx(styles.placeIcon, placeDisputed && styles.placeUncertain)}
              title={placeDisputed ? 'Tempat turun diperselisihkan' : revelationPlace}
              aria-label={placeDisputed ? 'Tempat turun diperselisihkan' : revelationPlace}
              translate="no"
            >
              {placeDisputed ? '?' : isMakki ? 'makkah' : 'madinah'}
            </span>
          </div>

          <div className={styles.titleSlot} lang="ar" translate="no">
            <span className={styles.titleName} aria-hidden="true">
              {getSurahLigature(chapterId)}
            </span>
            <span className={styles.titleLabel} aria-hidden="true">
              surah-icon
            </span>
          </div>

          <div className={styles.verseSlot} aria-label={`${versesCount} ayat`}>
            <span className={styles.verseNumber}>{versesCount}</span>
            <span className={styles.verseLabel}>Ayat</span>
          </div>
        </div>
      </div>

      {chapterId !== 1 && chapterId !== 9 && (
        <div className={styles.bismillah} translate="no">
          ﷽
        </div>
      )}
    </div>
  );
}

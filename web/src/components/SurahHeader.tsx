import styles from './SurahHeader.module.css';

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

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame} aria-label={`Surah ${chapterId}`}>
        <span className={styles.frameGlyph} aria-hidden="true" translate="no">
          surah_header
        </span>

        <div className={styles.frameContent}>
          <div className={styles.placeSlot}>
            <span className={styles.placeIcon} title={revelationPlace} translate="no">
              {isMakki ? 'makkah' : 'madinah'}
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

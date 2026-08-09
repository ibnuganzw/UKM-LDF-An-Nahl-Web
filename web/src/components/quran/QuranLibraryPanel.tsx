import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_QURAN_COLLECTION } from '../../lib/quranLibrary';
import { useQuranLibrary } from '../../state/QuranLibraryContext';
import styles from './QuranLibraryPanel.module.css';

export function QuranLibraryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    activeCollection,
    addCollection,
    bookmarks,
    collections,
    removeBookmark,
    removeCollection,
    setActiveCollection,
  } = useQuranLibrary();
  const [collectionName, setCollectionName] = useState('');
  const visibleBookmarks = useMemo(
    () => bookmarks.filter((bookmark) => bookmark.collection === activeCollection),
    [activeCollection, bookmarks],
  );

  useEffect(() => {
    if (!open) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onClose, open]);

  if (!open) return null;

  const createCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addCollection(collectionName)) setCollectionName('');
  };

  const stopPanelClick = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="quran-library-title" onMouseDown={stopPanelClick}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Pustaka Pribadi</div>
            <h2 id="quran-library-title">Bookmark & Koleksi</h2>
          </div>
          <button type="button" className={styles.close} aria-label="Tutup pustaka ayat" onClick={onClose}>×</button>
        </div>

        <form className={styles.collectionForm} onSubmit={createCollection}>
          <label>
            <span>Koleksi baru</span>
            <input
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Misalnya: Tadabbur pagi"
              maxLength={36}
            />
          </label>
          <button type="submit">Buat</button>
        </form>

        <div className={styles.collectionTabs} aria-label="Pilih koleksi">
          {collections.map((collection) => (
            <div key={collection} className={styles.collectionTabWrap}>
              <button
                type="button"
                className={collection === activeCollection ? styles.collectionTabActive : styles.collectionTab}
                onClick={() => setActiveCollection(collection)}
              >
                {collection}
                <span>{bookmarks.filter((bookmark) => bookmark.collection === collection).length}</span>
              </button>
              {collection !== DEFAULT_QURAN_COLLECTION && (
                <button
                  type="button"
                  className={styles.collectionDelete}
                  aria-label={`Hapus koleksi ${collection}`}
                  onClick={() => removeCollection(collection)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={styles.list}>
          {visibleBookmarks.length === 0 && (
            <div className={styles.empty}>
              Belum ada ayat di koleksi ini. Pilih ikon bookmark pada ayat yang ingin disimpan.
            </div>
          )}
          {visibleBookmarks.map((bookmark) => (
            <article key={bookmark.id} className={styles.bookmark}>
              <Link to={bookmark.path} className={styles.bookmarkLink} onClick={onClose}>
                <span className={styles.reference}>{bookmark.surahName} · Ayat {bookmark.verseNumber}</span>
                <span className={styles.arabic} lang="ar" dir="rtl">{bookmark.arabic}</span>
                {bookmark.translation && <span className={styles.translation}>{bookmark.translation}</span>}
              </Link>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Hapus bookmark ${bookmark.verseKey}`}
                onClick={() => removeBookmark(bookmark.id)}
              >
                Hapus
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

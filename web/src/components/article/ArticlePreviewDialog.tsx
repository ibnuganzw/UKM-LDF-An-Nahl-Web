import { useRef, type MouseEvent } from 'react';
import { useModalFocus } from '../../hooks/useModalFocus';
import type { EnrichedArticle } from '../../types';
import { ArticlePresentation } from './ArticlePresentation';
import articleStyles from '../../pages/Artikel.module.css';
import styles from './ArticlePreviewDialog.module.css';

interface ArticlePreviewDialogProps {
  article: EnrichedArticle;
  onClose: () => void;
}

export function ArticlePreviewDialog({ article, onClose }: ArticlePreviewDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalFocus(true, onClose, closeRef);

  const stopPanelClick = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        onMouseDown={stopPanelClick}
      >
        <header className={styles.toolbar}>
          <div>
            <div className={styles.eyebrow}>Belum dipublikasikan</div>
            <h2 id="article-preview-title">Pratinjau artikel</h2>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Tutup pratinjau">
            ×
          </button>
        </header>

        <div className={styles.scrollArea}>
          <div className={`${articleStyles.page} ${styles.articleCanvas}`}>
            <div className={styles.notice} role="status">
              Ini tampilan pembaca berdasarkan isi formulir saat ini. Pratinjau tidak menyimpan atau menerbitkan artikel.
            </div>
            <ArticlePresentation article={article} />
          </div>
        </div>
      </section>
    </div>
  );
}

import { Badge, Hex } from '../ui';
import { REVIEW_STATUS_LABELS } from '../../lib/articleEditorial';
import { CATEGORY_COLORS, soft } from '../../lib/colors';
import { MON } from '../../lib/dates';
import { sanitizeArticleHtml } from '../../lib/sanitizeHtml';
import type { EnrichedArticle } from '../../types';
import styles from '../../pages/Artikel.module.css';

interface ArticlePresentationProps {
  article: EnrichedArticle;
}

function formatArticleDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MON[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * The canonical article body used by both the public detail route and the
 * admin preview. Keeping one presentation component prevents the preview from
 * drifting away from what readers actually receive after publication.
 */
export function ArticlePresentation({ article }: ArticlePresentationProps) {
  const color = CATEGORY_COLORS[article.cat];
  const dateLabel = formatArticleDate(article.publishedAt ?? article.createdAt);
  const reviewedLabel = formatArticleDate(article.reviewedAt);

  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroMeta}>
          <Badge color={color} background={soft(color, '12')} style={{ padding: '6px 14px', gap: 7 }}>
            <Hex width={7} height={8} bg={color} />
            {article.cat}
          </Badge>
          <span className={`${styles.reviewBadge} ${styles[article.reviewStatus]}`}>
            {REVIEW_STATUS_LABELS[article.reviewStatus]}
          </span>
        </div>

        <h1 className={styles.title}>{article.title}</h1>
        {article.dek && <p className={styles.dek}>{article.dek}</p>}

        <div className={styles.byline}>
          <div>
            <strong>{article.authorName}</strong>
            <span>{article.authorRole}</span>
          </div>
          <div className={styles.readingMeta}>
            {dateLabel && <span>{dateLabel}</span>}
            <span>{article.mins} menit baca</span>
          </div>
        </div>

        {article.topics.length > 0 && (
          <div className={styles.topics} aria-label="Topik tulisan">
            {article.topics.map((topic) => <span key={topic}>{topic}</span>)}
          </div>
        )}
      </header>

      <main className={styles.body}>
        {article.coverImageUrl && (
          <figure className={styles.coverFigure}>
            <img src={article.coverImageUrl} alt={article.coverImageAlt} className={styles.cover} />
            {article.coverImageCaption && <figcaption>{article.coverImageCaption}</figcaption>}
          </figure>
        )}

        <div
          className={styles.richContent}
          dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.contentHtml) }}
        />

        <aside className={styles.trustPanel} aria-labelledby={`article-review-heading-${article.id}`}>
          <div className={styles.trustEyebrow}>Transparansi editorial</div>
          <h2 id={`article-review-heading-${article.id}`}>Catatan penelaahan</h2>
          <p>
            {article.verificationSummary ?? (
              article.reviewStatus === 'reviewed'
                ? 'Naskah ini telah melewati penelaahan ilmiah dan syariah sebelum diterbitkan.'
                : 'Tulisan ini belum memiliki catatan penelaahan lengkap yang dipublikasikan.'
            )}
          </p>
          <dl className={styles.reviewers}>
            <div>
              <dt>Penelaah ilmiah</dt>
              <dd>{article.scientificReviewerName ?? 'Belum dicantumkan'}</dd>
              {article.scientificReviewerRole && <dd className={styles.reviewerRole}>{article.scientificReviewerRole}</dd>}
            </div>
            <div>
              <dt>Penelaah syariah</dt>
              <dd>{article.shariaReviewerName ?? 'Belum dicantumkan'}</dd>
              {article.shariaReviewerRole && <dd className={styles.reviewerRole}>{article.shariaReviewerRole}</dd>}
            </div>
          </dl>
          <div className={styles.reviewFoot}>
            {REVIEW_STATUS_LABELS[article.reviewStatus]}
            {reviewedLabel ? ` · ${reviewedLabel}` : ''}
          </div>
        </aside>
      </main>
    </>
  );
}

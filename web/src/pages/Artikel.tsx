import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './Artikel.module.css';
import { Badge, EmptyState, Hex } from '../components/ui';
import { useArticles } from '../hooks/useArticles';
import { REVIEW_STATUS_LABELS } from '../lib/articleEditorial';
import { CATEGORY_COLORS, soft } from '../lib/colors';
import { MON } from '../lib/dates';
import {
  createArticleStructuredData,
  createBreadcrumbStructuredData,
  createOrganizationStructuredData,
  setPageSeo,
} from '../lib/seo';
import { sanitizeArticleHtml } from '../lib/sanitizeHtml';

/** Hairline gold bar pinned to the viewport that follows reading position
 * without re-rendering the article on every scroll event. */
function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return <div ref={barRef} className={styles.progress} aria-hidden="true" />;
}

function formatArticleDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MON[date.getMonth()]} ${date.getFullYear()}`;
}

export default function Artikel() {
  const { slug } = useParams<{ slug: string }>();
  const { bySlug, loading, error, refresh } = useArticles();
  const article = bySlug(slug);

  useEffect(() => {
    if (article) {
      const path = `/konten/${article.slug}`;
      const description = article.dek || article.excerpt;
      setPageSeo({
        title: article.title,
        description,
        path,
        image: article.coverImageUrl,
        type: 'article',
        publishedTime: article.publishedAt,
        modifiedTime: article.updatedAt,
        structuredData: [
          createOrganizationStructuredData(),
          createArticleStructuredData({
            path,
            title: article.title,
            description,
            image: article.coverImageUrl,
            authorName: article.authorName,
            category: article.cat,
            topics: article.topics,
            publishedAt: article.publishedAt,
            updatedAt: article.updatedAt,
            reviewers: [article.scientificReviewerName, article.shariaReviewerName].filter(
              (name): name is string => Boolean(name),
            ),
          }),
          createBreadcrumbStructuredData([
            { name: 'Beranda', path: '/' },
            { name: 'Tulisan', path: '/konten' },
            { name: article.title, path },
          ]),
        ],
      });
    } else if (!loading) {
      setPageSeo({
        title: 'Tulisan Tidak Ditemukan',
        description: 'Tulisan yang diminta tidak ditemukan atau belum diterbitkan.',
        path: `/konten/${slug ?? ''}`,
        noIndex: true,
      });
    }
  }, [article, loading, slug]);

  if (loading) return <div className={styles.page}>Memuat…</div>;

  if (error) {
    return (
      <div className={styles.page}>
        <EmptyState title="Tulisan belum dapat dimuat." body={error} action={{ label: 'Coba lagi', onClick: refresh }} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4.5h10a4 4 0 0 1 4 4V20H8a3 3 0 0 1-3-3Z" />
              <path d="M8 20a3 3 0 0 1 3-3h8M8.5 8.5h6M8.5 12h6" />
            </svg>
          }
          title="Tulisan ini tidak ditemukan."
          body="Tautannya mungkin sudah berubah, atau tulisannya belum diterbitkan."
          action={{ label: 'Semua tulisan →', to: '/konten' }}
        />
      </div>
    );
  }

  const color = CATEGORY_COLORS[article.cat];
  const dateLabel = formatArticleDate(article.publishedAt ?? article.createdAt);
  const reviewedLabel = formatArticleDate(article.reviewedAt);

  return (
    <div className={styles.page}>
      <ReadingProgress />
      <Link to="/konten" className={styles.back}>← Semua tulisan</Link>

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

        <aside className={styles.trustPanel} aria-labelledby="article-review-heading">
          <div className={styles.trustEyebrow}>Transparansi editorial</div>
          <h2 id="article-review-heading">Catatan penelaahan</h2>
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
    </div>
  );
}

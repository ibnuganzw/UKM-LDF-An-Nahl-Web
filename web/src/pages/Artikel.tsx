import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './Artikel.module.css';
import { EmptyState } from '../components/ui';
import { ArticlePresentation } from '../components/article/ArticlePresentation';
import { useArticles } from '../hooks/useArticles';
import {
  createArticleStructuredData,
  createBreadcrumbStructuredData,
  createOrganizationStructuredData,
  setPageSeo,
} from '../lib/seo';

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

  return (
    <div className={styles.page}>
      <ReadingProgress />
      <Link to="/konten" className={styles.back}>← Semua tulisan</Link>
      <ArticlePresentation article={article} />
    </div>
  );
}

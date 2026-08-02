import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Konten.module.css';
import { Badge, EmptyState, FilterChip, GlassCard } from '../components/ui';
import { useArticles } from '../hooks/useArticles';
import { organizeArticles, REVIEW_STATUS_LABELS } from '../lib/articleEditorial';
import { CATEGORY_COLORS, soft } from '../lib/colors';
import { KONTEN_FILTERS } from '../lib/filters';
import type { ArticleCategory, EnrichedArticle } from '../types';
import { useTheme } from '../state/useTheme';

function ArticleBadge({ article }: { article: EnrichedArticle }) {
  const color = CATEGORY_COLORS[article.cat];
  return (
    <Badge color={color} background={soft(color, '12')} style={{ padding: '5px 12px', gap: 7 }}>
      <span className={styles.categoryDot} style={{ background: color }} aria-hidden="true" />
      {article.cat}
    </Badge>
  );
}

export default function Konten() {
  const { theme } = useTheme();
  const location = useLocation();
  const initialTab = (location.state as { kontenTab?: ArticleCategory } | null)?.kontenTab ?? 'Semua';
  const [tab, setTab] = useState<'Semua' | ArticleCategory>(initialTab);
  const { all, loading, error, refresh } = useArticles();

  const rows = all.filter((article) => tab === 'Semua' || article.cat === tab);
  const hierarchy = organizeArticles(rows);

  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>Bacaan</div>
      <h1 className={styles.h1}>Tulisan An-Nahl</h1>
      <p className={styles.lead}>Islam Veteriner, Kisah, dan Renungan — tulisan ringan yang menghubungkan iman, ilmu, dan amanah profesi.</p>

      <div className={styles.chipRow} role="group" aria-label="Filter tulisan">
        {KONTEN_FILTERS.map((key) => {
          const active = tab === key;
          const color = key === 'Semua' ? 'var(--gold-light)' : CATEGORY_COLORS[key];
          const lightActiveBg = key === 'Semua'
            ? 'var(--gold-gradient)'
            : `color-mix(in srgb, ${color} 15%, #FFFFFF)`;
          return (
            <FilterChip
              key={key}
              label={key}
              active={active}
              onClick={() => setTab(key)}
              bg={active ? (theme === 'light' ? lightActiveBg : color) : theme === 'light' ? 'var(--control-fill)' : 'rgba(255,255,255,.05)'}
              color={active ? (theme === 'light' && key !== 'Semua' ? color : 'var(--text-on-gold-alt)') : 'var(--text-body)'}
              border={active ? color : theme === 'light' ? 'var(--control-border)' : 'rgba(232,199,102,.22)'}
            />
          );
        })}
      </div>

      <div className={styles.collection}>
        {loading && (
          <div className={styles.loadingGrid} role="status" aria-label="Memuat tulisan">
            {[0, 1, 2].map((item) => <span key={item} className={styles.loadingCard} />)}
          </div>
        )}

        {!loading && error && (
          <EmptyState title="Tulisan belum dapat dimuat." body={error} action={{ label: 'Coba lagi', onClick: refresh }} />
        )}

        {!loading && !error && hierarchy.featured && (
          <section aria-labelledby="featured-heading">
            <div className={styles.sectionLabel} id="featured-heading">Tulisan utama</div>
            <GlassCard to={`/konten/${hierarchy.featured.slug}`} hover radius={24} padding="0" className={styles.featured}>
              {hierarchy.featured.coverImageUrl && (
                <img
                  src={hierarchy.featured.coverImageUrl}
                  alt={hierarchy.featured.coverImageAlt}
                  className={styles.featuredCover}
                />
              )}
              <div className={styles.featuredContent}>
                <div className={styles.cardTop}>
                  <ArticleBadge article={hierarchy.featured} />
                  <span className={styles.reviewState}>{REVIEW_STATUS_LABELS[hierarchy.featured.reviewStatus]}</span>
                </div>
                <h2 className={styles.featuredTitle}>{hierarchy.featured.title}</h2>
                <p className={styles.featuredDek}>{hierarchy.featured.dek || hierarchy.featured.excerpt}</p>
                <div className={styles.featuredMeta}>
                  <span>{hierarchy.featured.authorName}</span>
                  <span>{hierarchy.featured.mins} menit baca</span>
                </div>
                <div className={styles.readMore}>Baca tulisan →</div>
              </div>
            </GlassCard>
          </section>
        )}

        {!loading && !error && hierarchy.secondary.length > 0 && (
          <section aria-labelledby="latest-heading">
            <div className={styles.sectionLabel} id="latest-heading">Pilihan terbaru</div>
            <div className={styles.secondaryGrid}>
              {hierarchy.secondary.map((article) => (
                <GlassCard key={article.id} to={`/konten/${article.slug}`} hover radius={20} padding="22px" className={styles.card}>
                  {article.coverImageUrl && <img src={article.coverImageUrl} alt={article.coverImageAlt} className={styles.cover} />}
                  <div className={styles.cardTop}>
                    <ArticleBadge article={article} />
                    <span className={styles.mins}>{article.mins} mnt baca</span>
                  </div>
                  <h2 className={styles.title}>{article.title}</h2>
                  <p className={styles.excerpt}>{article.excerpt}</p>
                  <div className={styles.readMore}>Baca selengkapnya →</div>
                </GlassCard>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && hierarchy.archive.length > 0 && (
          <section aria-labelledby="archive-heading">
            <div className={styles.sectionLabel} id="archive-heading">Arsip tulisan</div>
            <div className={styles.archiveList}>
              {hierarchy.archive.map((article) => (
                <Link key={article.id} to={`/konten/${article.slug}`} className={styles.archiveRow}>
                  <div>
                    <ArticleBadge article={article} />
                    <h2>{article.title}</h2>
                    <p>{article.excerpt}</p>
                  </div>
                  <div className={styles.archiveMeta}>
                    <span>{article.authorName}</span>
                    <span>{article.mins} menit baca</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && rows.length === 0 && (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4.5h10a4 4 0 0 1 4 4V20H8a3 3 0 0 1-3-3Z" />
                <path d="M8 20a3 3 0 0 1 3-3h8M8.5 8.5h6M8.5 12h6" />
              </svg>
            }
            title={tab === 'Semua' ? 'Tulisan pertama sedang disiapkan.' : `Belum ada tulisan ${tab}.`}
            body="Sambil menunggu, luangkan waktu untuk melanjutkan bacaan Al-Qur'an."
            action={
              tab === 'Semua'
                ? { label: 'Buka Al-Qur\'an →', to: '/quran' }
                : { label: 'Tampilkan semua tulisan', onClick: () => setTab('Semua') }
            }
          />
        )}
      </div>
    </div>
  );
}

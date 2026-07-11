import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Konten.module.css';
import { Badge, FilterChip, GlassCard } from '../components/ui';
import { useArticles } from '../hooks/useArticles';
import { CATEGORY_COLORS, soft } from '../lib/colors';
import { KONTEN_FILTERS } from '../lib/filters';
import type { ArticleCategory } from '../types';

export default function Konten() {
  const location = useLocation();
  const initialTab = (location.state as { kontenTab?: ArticleCategory } | null)?.kontenTab ?? 'Semua';
  const [tab, setTab] = useState<'Semua' | ArticleCategory>(initialTab);
  const { all, loading } = useArticles();

  const rows = all.filter((a) => tab === 'Semua' || a.cat === tab);

  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>Bacaan</div>
      <h1 className={styles.h1}>Tulisan An-Nahl</h1>
      <p className={styles.lead}>Islam Veteriner, Kisah, dan Renungan — tulisan ringan yang menghubungkan iman, ilmu, dan amanah profesi.</p>

      <div className={styles.chipRow} role="group" aria-label="Filter tulisan">
        {KONTEN_FILTERS.map((k) => {
          const active = tab === k;
          const col = k === 'Semua' ? '#E8C766' : CATEGORY_COLORS[k];
          return (
            <FilterChip
              key={k}
              label={k}
              active={active}
              onClick={() => setTab(k)}
              bg={active ? col : 'rgba(255,255,255,.05)'}
              color={active ? '#0A1128' : '#A9B3D1'}
              border={active ? col : 'rgba(232,199,102,.22)'}
            />
          );
        })}
      </div>

      <div className={styles.grid}>
        {loading && (
          <div className={styles.loadingGrid} role="status" aria-label="Memuat tulisan">
            {[0, 1, 2].map((item) => <span key={item} className={styles.loadingCard} />)}
          </div>
        )}
        {!loading && rows.map((t) => {
          const color = CATEGORY_COLORS[t.cat];
          return (
            <GlassCard key={t.id} to={`/konten/${t.slug}`} hover radius={18} padding="24px" className={styles.card}>
              {t.coverImageUrl && <img src={t.coverImageUrl} alt="" className={styles.cover} />}
              <div className={styles.cardTop}>
                <Badge color={color} background={soft(color, '12')} style={{ padding: '5px 12px', gap: 7 }}>
                  <span className={styles.categoryDot} style={{ background: color }} aria-hidden="true" />
                  {t.cat}
                </Badge>
                <span className={styles.mins}>{t.mins} mnt baca</span>
              </div>
              <div className={styles.title}>{t.title}</div>
              <p className={styles.excerpt}>{t.excerpt}</p>
              <div className={styles.readMore}>Baca selengkapnya →</div>
            </GlassCard>
          );
        })}
        {!loading && rows.length === 0 && (
          <section className={styles.empty} role="status">
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4.5h10a4 4 0 0 1 4 4V20H8a3 3 0 0 1-3-3Z" />
                <path d="M8 20a3 3 0 0 1 3-3h8M8.5 8.5h6M8.5 12h6" />
              </svg>
            </div>
            <h2>{tab === 'Semua' ? 'Tulisan pertama sedang disiapkan.' : `Belum ada tulisan ${tab}.`}</h2>
            <p>Sambil menunggu, luangkan waktu untuk melanjutkan bacaan Al-Qur'an.</p>
            {tab === 'Semua' ? (
              <Link to="/quran" className={styles.emptyAction}>Buka Al-Qur'an →</Link>
            ) : (
              <button type="button" className={styles.emptyAction} onClick={() => setTab('Semua')}>Tampilkan semua tulisan</button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

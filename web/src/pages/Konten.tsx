import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Konten.module.css';
import { Badge, FilterChip, GlassCard, Hex } from '../components/ui';
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

      <div className={styles.chipRow}>
        {KONTEN_FILTERS.map((k) => {
          const active = tab === k;
          const col = k === 'Semua' ? '#E8C766' : CATEGORY_COLORS[k];
          return (
            <FilterChip
              key={k}
              label={k}
              onClick={() => setTab(k)}
              bg={active ? col : 'rgba(255,255,255,.05)'}
              color={active ? '#0A1128' : '#A9B3D1'}
              border={active ? col : 'rgba(232,199,102,.22)'}
            />
          );
        })}
      </div>

      {loading && <div className={styles.loading}>Memuat…</div>}

      <div className={styles.grid}>
        {rows.map((t) => {
          const color = CATEGORY_COLORS[t.cat];
          return (
            <GlassCard key={t.id} to={`/konten/${t.slug}`} hover radius={22} padding="26px" className={styles.card}>
              {t.coverImageUrl && <img src={t.coverImageUrl} alt="" className={styles.cover} />}
              <div className={styles.cardTop}>
                <Badge color={color} background={soft(color, '12')} style={{ padding: '5px 12px', gap: 7 }}>
                  <Hex width={7} height={8} bg={color} />
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
        {!loading && rows.length === 0 && <div className={styles.empty}>Belum ada tulisan di kategori ini.</div>}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminArtikel.module.css';
import { Badge, GlassCard } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { collectArticleImageUrls, deleteArticleImagesByUrls } from '../lib/articleImages';
import { CATEGORY_COLORS } from '../lib/colors';
import type { ArticleCategory, ArticleStatus } from '../types';

interface ArticleRow {
  id: string;
  slug: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  status: ArticleStatus;
  updated_at: string;
}

export default function AdminArtikel() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('articles')
      .select('id, slug, category, title, excerpt, status, updated_at')
      .order('updated_at', { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setArticles((data as ArticleRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePublish = async (a: ArticleRow) => {
    setError(null);
    setBusyId(a.id);
    try {
      const nextStatus: ArticleStatus = a.status === 'published' ? 'draft' : 'published';
      const { error: err } = await supabase.from('articles').update({ status: nextStatus }).eq('id', a.id);
      if (err) {
        setError(err.message);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!window.confirm('Hapus tulisan ini? Tindakan ini tidak bisa dibatalkan.')) return;
    setError(null);
    // Read the image references before deleting the row, so we can clean up the
    // cover + inline images from storage afterwards (they'd otherwise orphan).
    const { data: art } = await supabase
      .from('articles')
      .select('cover_image_url, content_html')
      .eq('id', id)
      .single<{ cover_image_url: string | null; content_html: string }>();

    const { error: err } = await supabase.from('articles').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    if (art) {
      await deleteArticleImagesByUrls(collectArticleImageUrls(art.cover_image_url, art.content_html));
    }
    await load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>Panel Admin</div>
          <h1 className={styles.h1}>Kelola Artikel</h1>
        </div>
        <button className={styles.makeBtn} onClick={() => navigate('/admin/artikel/baru')}>+ Tulis Artikel</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Memuat…</div>}

      {!loading && (
        <div className={styles.list}>
          {articles.length === 0 && <div className={styles.empty}>Belum ada tulisan.</div>}
          {articles.map((a) => (
            <GlassCard key={a.id} radius={20} padding="16px 18px" className={styles.row}>
              <div className={styles.rowLeft}>
                <div className={styles.rowBadges}>
                  <Badge color={CATEGORY_COLORS[a.category]} style={{ padding: '3px 10px' }}>{a.category}</Badge>
                  <Badge color={a.status === 'published' ? '#5CCBA0' : '#8E99BB'} uppercase={false} style={{ padding: '3px 10px' }}>
                    {a.status === 'published' ? 'Terbit' : 'Draft'}
                  </Badge>
                </div>
                <div className={styles.rowTitle}>{a.title}</div>
                <div className={styles.rowMeta}>{a.excerpt}</div>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.viewBtn} onClick={() => navigate(`/admin/artikel/${a.id}/edit`)}>Edit</button>
                <button className={styles.makeBtn} disabled={busyId === a.id} onClick={() => togglePublish(a)}>
                  {busyId === a.id ? 'Memproses…' : a.status === 'published' ? 'Batalkan Terbit' : 'Terbitkan'}
                </button>
                <button className={styles.deleteBtn} onClick={() => deleteArticle(a.id)}>Hapus</button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

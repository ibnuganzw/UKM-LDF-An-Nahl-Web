import { Link, useParams } from 'react-router-dom';
import styles from './Artikel.module.css';
import { Badge, Hex } from '../components/ui';
import { useArticles } from '../hooks/useArticles';
import { CATEGORY_COLORS, soft } from '../lib/colors';
import { sanitizeArticleHtml } from '../lib/sanitizeHtml';

export default function Artikel() {
  const { slug } = useParams<{ slug: string }>();
  const { bySlug, loading } = useArticles();
  const art = bySlug(slug);

  if (loading) {
    return <div className={styles.page}>Memuat…</div>;
  }

  if (!art) {
    return <div className={styles.page}>Tulisan tidak ditemukan.</div>;
  }

  const color = CATEGORY_COLORS[art.cat];

  return (
    <div className={styles.page}>
      <Link to="/konten" className={styles.back}>← Semua tulisan</Link>

      <div className={styles.body}>
        <Badge color={color} background={soft(color, '12')} style={{ padding: '6px 14px', gap: 7 }}>
          <Hex width={7} height={8} bg={color} />
          {art.cat}
        </Badge>

        <h1 className={styles.title}>{art.title}</h1>
        <div className={styles.byline}>Tim Media An-Nahl · {art.mins} menit baca</div>

        {art.coverImageUrl && <img src={art.coverImageUrl} alt="" className={styles.cover} />}

        <div
          className={styles.richContent}
          dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(art.contentHtml) }}
        />
      </div>
    </div>
  );
}

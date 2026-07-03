import { Link, useParams } from 'react-router-dom';
import styles from './Artikel.module.css';
import { Badge, DashedNote, Hex } from '../components/ui';
import { ARTICLES } from '../data/articles';
import { CATEGORY_COLORS, soft } from '../lib/colors';

export default function Artikel() {
  const { id } = useParams<{ id: string }>();
  const art = ARTICLES.find((a) => a.id === id) ?? ARTICLES[0];
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
        <div className={styles.byline}>Tim Media An-Nahl · {art.mins} menit baca · Konten contoh</div>

        <div className={styles.paragraphs}>
          {art.body.map((p, i) => (
            <p key={i} className={styles.paragraph}>{p}</p>
          ))}
        </div>

        <DashedNote className={styles.note}>
          Ini konten contoh untuk prototype — struktur dan tampilannya siap diisi tulisan asli tim redaksi An-Nahl.
        </DashedNote>
      </div>
    </div>
  );
}

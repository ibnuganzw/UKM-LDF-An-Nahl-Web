import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './AdminQR.module.css';
import { useAgendas } from '../hooks/useAgendas';
import { useApp } from '../state/AppContext';
import { generateQrCells } from '../lib/qr';

export default function AdminQR() {
  const { id } = useParams<{ id: string }>();
  const { byId } = useAgendas();
  const { qrs, killQR } = useApp();
  const navigate = useNavigate();

  const agenda = byId(id);
  const code = (agenda && qrs[agenda.id]) || 'ANH-XXXX';
  const cells = useMemo(() => generateQrCells(code), [code]);

  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.back}>← Panel admin</Link>

      <div className={styles.card}>
        <span className={styles.activeBadge}>● QR absensi aktif</span>
        <div className={styles.title}>{agenda?.title}</div>
        <div className={styles.meta}>{agenda ? `${agenda.dateLabel} · ${agenda.timeLabel} · ${agenda.location}` : ''}</div>

        <div className={styles.qrGrid}>
          {cells.map((on, i) => (
            <div key={i} style={{ background: on ? '#241B04' : 'transparent' }} />
          ))}
        </div>

        <div className={styles.code}>{code}</div>
        <div className={styles.disclaimer}>Tampilkan layar ini di lokasi acara. QR dummy — di versi penuh, QR berganti berkala untuk mencegah titip absen.</div>
        <button
          className={styles.killBtn}
          onClick={() => {
            if (agenda) {
              killQR(agenda.id);
              navigate('/admin');
            }
          }}
        >
          Nonaktifkan QR
        </button>
      </div>
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import styles from './AgendaDetail.module.css';
import { Badge, Button, GlassCard } from '../components/ui';
import { useAgendas } from '../hooks/useAgendas';
import { useApp } from '../state/AppContext';
import { cx } from '../lib/cx';

export default function AgendaDetail() {
  const { id } = useParams<{ id: string }>();
  const { all } = useAgendas();
  const { user } = useApp();

  const det = all.find((a) => a.id === id) ?? all[0];
  const loggedIn = !!user;

  if (!det) {
    return <div className={styles.page}>Agenda tidak ditemukan.</div>;
  }

  const detAttended = det.attended && loggedIn;
  const detCanAbsen = loggedIn && det.qrActive && !det.attended;
  const detNeedLogin = !loggedIn && det.qrActive;
  const detNoQr = !det.qrActive && !(det.attended && loggedIn);

  return (
    <div className={styles.page}>
      <Link to="/agenda" className={styles.back}>← Semua agenda</Link>

      <GlassCard radius={26} borderColor="rgba(232,199,102,.2)" padding="clamp(24px,4vw,38px)" className={styles.panel}>
        <div className={styles.badgeRow}>
          <Badge color={det.typeColor} style={{ fontSize: 11, padding: '5px 13px' }}>{det.type}</Badge>
          <Badge color={det.statusColor} uppercase={false} style={{ fontSize: 12, padding: '5px 13px' }}>{det.statusLabel}</Badge>
          {det.qrActive && (
            <Badge color="#5CCBA0" uppercase={false} pulse style={{ fontSize: 12, padding: '5px 13px' }}>
              ● QR absensi aktif
            </Badge>
          )}
        </div>

        <h1 className={styles.title}>{det.title}</h1>
        <p className={styles.desc}>{det.desc}</p>

        <div className={styles.infoGrid}>
          <div className={styles.infoCell}>
            <div className={styles.infoLabel}>Waktu</div>
            <div className={styles.infoValue}>{det.dateLabel}</div>
            <div className={styles.infoSub}>{det.timeLabel}</div>
          </div>
          <div className={styles.infoCell}>
            <div className={styles.infoLabel}>Lokasi</div>
            <div className={styles.infoValue}>{det.location}</div>
          </div>
          <div className={styles.infoCell}>
            <div className={styles.infoLabel}>Penanggung jawab</div>
            <div className={styles.infoValue}>{det.pj}</div>
          </div>
          {det.hasPemateri && (
            <div className={cx(styles.infoCell, styles.infoCellFeatured)}>
              <div className={cx(styles.infoLabel, styles.infoLabelGold)}>Pemateri</div>
              <div className={styles.infoValue}>{det.pemateri}</div>
            </div>
          )}
        </div>

        <div className={styles.actionArea}>
          {detAttended && (
            <div className={styles.attendedRow}>
              <span className={styles.attendedIcon}>✓</span> Kehadiranmu sudah tercatat. Alhamdulillah.
            </div>
          )}
          {detCanAbsen && (
            <Button variant="success" size="md" to={`/scan/${det.id}`}>Absen Sekarang — Pindai QR</Button>
          )}
          {detNeedLogin && (
            <div className={styles.needLoginRow}>
              <span className={styles.needLoginText}>QR absensi sedang aktif — masuk untuk mencatat kehadiranmu.</span>
              <Button variant="primary" size="sm" to="/login">Masuk</Button>
            </div>
          )}
          {detNoQr && (
            <div className={styles.noQrText}>QR absensi belum dibuka. Admin akan mengaktifkan QR di lokasi saat acara berlangsung.</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

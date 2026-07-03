import { useNavigate } from 'react-router-dom';
import styles from './Admin.module.css';
import { Badge, GlassCard } from '../components/ui';
import { useApp } from '../state/AppContext';
import { useAgendas } from '../hooks/useAgendas';

export default function Admin() {
  const { user, login, makeQR } = useApp();
  const { upcoming } = useAgendas();
  const navigate = useNavigate();

  const isAdmin = !!user && user.role === 'admin';

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <GlassCard radius={26} borderColor="rgba(232,199,102,.2)" className={styles.deniedCard}>
          <div className={styles.deniedTitle}>Khusus admin</div>
          <p className={styles.deniedText}>Halaman ini untuk pengurus yang mengelola QR absensi. Masuk sebagai admin untuk mencoba.</p>
          <div className={styles.deniedCta}>
            <button
              className={styles.makeBtn}
              style={{ width: '100%', padding: '13px 26px', fontSize: 14, minHeight: 48 }}
              onClick={() => {
                login('', 'admin');
              }}
            >
              Masuk sebagai Admin (demo)
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>Panel Admin</div>
          <h1 className={styles.h1}>QR Absensi Kegiatan</h1>
        </div>
        <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>
      <p className={styles.lead}>Buat QR untuk agenda yang sedang berlangsung, lalu tampilkan di lokasi. Anggota hanya bisa absen dengan memindai QR ini.</p>

      <div className={styles.list}>
        {upcoming.map((a) => (
          <GlassCard key={a.id} radius={20} padding="16px 18px" className={styles.row}>
            <div className={styles.rowLeft}>
              <div className={styles.rowBadges}>
                <Badge color={a.typeColor} style={{ padding: '3px 10px' }}>{a.type}</Badge>
                <span className={styles.rowStatus} style={{ color: a.statusColor }}>{a.statusLabel}</span>
              </div>
              <div className={styles.rowTitle}>{a.title}</div>
              <div className={styles.rowMeta}>{a.dateLabel} · {a.time} · {a.location}</div>
            </div>
            <div className={styles.rowActions}>
              {a.qrActive ? (
                <>
                  <Badge color="#5CCBA0" uppercase={false} pulse style={{ fontSize: 11.5, padding: '7px 13px' }}>● Aktif</Badge>
                  <button className={styles.viewBtn} onClick={() => navigate(`/admin/qr/${a.id}`)}>Lihat QR</button>
                </>
              ) : (
                <button
                  className={styles.makeBtn}
                  onClick={() => {
                    makeQR(a.id);
                    navigate(`/admin/qr/${a.id}`);
                  }}
                >
                  Buat QR
                </button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { Badge, GlassCard } from '../components/ui';
import { useApp } from '../state/AppContext';
import { useAgendas } from '../hooks/useAgendas';
import { useNow } from '../hooks/useNow';
import { getNextPrayer } from '../lib/prayer';
import { getGreeting } from '../lib/greeting';
import { cx } from '../lib/cx';

export default function Dashboard() {
  const { user, att, logout } = useApp();
  const { all, upcoming } = useAgendas();
  const now = useNow();
  const navigate = useNavigate();

  const prayer = getNextPrayer(now);
  const greeting = getGreeting(now);
  const absenRows = upcoming.slice(0, 4);
  const histRows = att
    .slice()
    .sort((x, y) => y.ts - x.ts)
    .map((x) => all.find((a) => a.id === x.id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  const doLogout = () => {
    // Full reload instead of SPA navigate(): clearing the user while RequireAuth is still
    // mounted on this guarded route causes it to redirect to /login instead of the intended
    // '/', regardless of call order. A hard redirect sidesteps that entirely and guarantees
    // no stale state survives the logout.
    logout();
    window.location.href = '/';
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.greeting}>{greeting},</div>
          <h1 className={styles.welcome}>Assalamu'alaikum, {user?.name.split(' ')[0]}</h1>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'admin' && (
            <button className={styles.adminBtn} onClick={() => navigate('/admin')}>Panel Admin</button>
          )}
          <button className={styles.logoutBtn} onClick={doLogout}>Keluar</button>
        </div>
      </div>

      <div className={styles.statGrid}>
        <GlassCard variant="featured" radius={22} padding="22px 24px" borderColor="rgba(232,199,102,.32)" background="linear-gradient(150deg,rgba(201,162,39,.18),rgba(255,255,255,.03))">
          <div className={styles.statLabel} style={{ color: '#C9A227' }}>Total kehadiran</div>
          <div className={styles.statValue}>{histRows.length}</div>
          <div className={styles.statSub} style={{ color: '#A9B3D1' }}>kegiatan tercatat</div>
        </GlassCard>
        <GlassCard radius={22} padding="22px 24px">
          <div className={styles.statLabel} style={{ color: '#8E99BB' }}>Agenda mendatang</div>
          <div className={styles.statValue}>{upcoming.length}</div>
          <div className={styles.statSub} style={{ color: '#8E99BB' }}>dalam waktu dekat</div>
        </GlassCard>
        <GlassCard radius={22} padding="22px 24px" borderColor="rgba(232,199,102,.26)">
          <div className={styles.statLabel} style={{ color: '#C9A227' }}>Menuju {prayer.name}</div>
          <div className={cx('cdGlow', styles.statCountdown)}>{prayer.countdown}</div>
          <div className={styles.statLink} onClick={() => navigate('/shalat')}>Jadwal shalat →</div>
        </GlassCard>
      </div>

      <div className={styles.bodyGrid}>
        <GlassCard radius={24} padding="24px">
          <div className={styles.panelHead}>
            <div className={styles.panelTitle}>Absensi kegiatan</div>
            <span className={styles.panelHint}>Pindai QR di lokasi</span>
          </div>
          <div className={styles.absenList}>
            {absenRows.map((a) => (
              <div key={a.id} className={styles.absenRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.absenTitle}>{a.title}</div>
                  <div className={styles.absenMeta}>{a.relLabel} · {a.time} · {a.qrActive ? 'QR aktif' : 'QR belum aktif'}</div>
                </div>
                {a.attended ? (
                  <Badge color="#5CCBA0" uppercase={false} style={{ fontSize: 12, padding: '8px 14px' }}>Hadir ✓</Badge>
                ) : (
                  <button
                    className={styles.absenBtn}
                    style={{
                      background: a.qrActive ? 'linear-gradient(135deg,#5CCBA0,#2E9C77)' : 'rgba(255,255,255,.08)',
                      color: a.qrActive ? '#06281C' : '#A9B3D1',
                    }}
                    onClick={() => navigate(`/scan/${a.id}`)}
                  >
                    Absen
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className={styles.panelNote}>Tombol absen membuka pemindai QR. QR hanya aktif jika admin sudah membukanya di lokasi acara.</div>
        </GlassCard>

        <div className={styles.rightCol}>
          <GlassCard radius={24} padding="24px">
            <div className={styles.panelTitle} style={{ marginBottom: 14 }}>Riwayat kehadiran</div>
            <div className={styles.histList}>
              {histRows.map((a, i) => (
                <div key={i} className={styles.histRow}>
                  <span className={styles.histCheck}>✓</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.histTitle}>{a.title}</div>
                    <div className={styles.histDate}>{a.dateLabel}</div>
                  </div>
                  <Badge color={a.typeColor} style={{ fontSize: 10, padding: '3px 9px' }}>{a.type}</Badge>
                </div>
              ))}
              {histRows.length === 0 && <div className={styles.histEmpty}>Belum ada riwayat kehadiran.</div>}
            </div>
          </GlassCard>

          <GlassCard
            variant="featured"
            radius={24}
            padding="22px 24px"
            borderColor="rgba(232,199,102,.32)"
            background="linear-gradient(150deg,rgba(201,162,39,.18),rgba(255,255,255,.03))"
            to="/quran"
            className={styles.quranBanner}
          >
            <div>
              <div className={styles.quranBannerArabic} dir="rtl">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>
              <div className={styles.quranBannerText}>Lanjutkan membaca Al-Qur'an →</div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

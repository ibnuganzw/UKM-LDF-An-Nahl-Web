import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { Badge, GlassCard } from '../components/ui';
import { useApp } from '../state/AppContext';
import { useAgendas } from '../hooks/useAgendas';
import { useNow } from '../hooks/useNow';
import { usePrayerSchedule } from '../hooks/usePrayerSchedule';
import { getNextPrayer } from '../lib/prayer';
import { getGreeting } from '../lib/greeting';
import { quranText } from '../lib/quranText';
import { isAdminRole } from '../lib/roles';

export default function Dashboard() {
  const { profile, logout } = useApp();
  const { all, upcoming } = useAgendas();
  const now = useNow();
  const navigate = useNavigate();

  const schedule = usePrayerSchedule(now);
  const prayer = getNextPrayer(now, schedule.prayerTimes, schedule.utcOffsetHours);
  const prayerAvailable = schedule.source !== 'unavailable';
  const greeting = getGreeting(now);
  const absenRows = upcoming.slice(0, 4);
  const histRows = all
    .filter((a) => a.attended)
    .sort((x, y) => y.date.getTime() - x.date.getTime());

  const doLogout = async () => {
    // Full reload instead of SPA navigate(): clearing the session while RequireAuth is
    // still mounted on this guarded route causes it to redirect to /login instead of the
    // intended '/', regardless of call order. A hard redirect sidesteps that entirely and
    // guarantees no stale state survives the logout.
    await logout();
    window.location.href = '/';
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.greeting}>{greeting},</div>
          <h1 className={styles.welcome}>Assalamu'alaikum, {profile?.name.split(' ')[0]}</h1>
          {profile && (
            <div className={styles.userMeta}>
              NIM {profile.nim} · Angkatan {profile.angkatanYear}
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
          {isAdminRole(profile) && (
            <button className={styles.adminBtn} onClick={() => navigate('/admin')}>Panel Admin</button>
          )}
          <button className={styles.logoutBtn} onClick={doLogout}>Keluar</button>
        </div>
      </div>

      <div className={styles.statGrid}>
        <GlassCard variant="featured" radius={20} padding="22px 24px">
          <div className={styles.statLabel} style={{ color: 'var(--gold-dark)' }}>Total kehadiran</div>
          <div className={styles.statValue}>{histRows.length}</div>
          <div className={styles.statSub} style={{ color: 'var(--text-body)' }}>kegiatan tercatat</div>
        </GlassCard>
        <GlassCard radius={20} padding="22px 24px">
          <div className={styles.statLabel} style={{ color: 'var(--text-muted)' }}>Agenda mendatang</div>
          <div className={styles.statValue}>{upcoming.length}</div>
          <div className={styles.statSub} style={{ color: 'var(--text-muted)' }}>dalam waktu dekat</div>
        </GlassCard>
        <GlassCard radius={20} padding="22px 24px" borderColor="rgba(232,199,102,.26)">
          <div className={styles.statLabel} style={{ color: 'var(--gold-dark)' }}>
            {prayerAvailable ? `Menuju ${prayer.name}` : 'Jadwal shalat'}
          </div>
          <div className={styles.statCountdown}>
            {prayerAvailable ? prayer.countdown : schedule.status === 'loading' ? 'Memuat…' : 'Belum tersedia'}
          </div>
          <div className={styles.statLink} onClick={() => navigate('/shalat')}>Jadwal shalat →</div>
        </GlassCard>
      </div>

      <div className={styles.bodyGrid}>
        <GlassCard radius={20} padding="24px">
          <div className={styles.panelHead}>
            <div className={styles.panelTitle}>Absensi kegiatan</div>
            <span className={styles.panelHint}>Pindai QR di lokasi</span>
          </div>
          <div className={styles.absenList}>
            {absenRows.map((a) => (
              <div key={a.id} className={styles.absenRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.absenTitle}>{a.title}</div>
                  <div className={styles.absenMeta}>
                    {a.relLabel} · {a.startTime} · {a.mode === 'registration' ? (a.registered ? 'Terdaftar' : 'Perlu daftar') : a.qrActive ? 'QR aktif' : 'QR belum aktif'}
                  </div>
                </div>
                {a.attended ? (
                  <Badge color="var(--success-light)" uppercase={false} style={{ fontSize: 12, padding: '8px 14px' }}>Hadir ✓</Badge>
                ) : (
                  <button className={styles.absenBtn} style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={() => navigate(`/agenda/${a.id}`)}>
                    Detail
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className={styles.panelNote}>
            Absen agenda universal lewat scan QR di lokasi acara. Agenda registrasi perlu daftar dulu lewat halaman detailnya.
          </div>
        </GlassCard>

        <div className={styles.rightCol}>
          <GlassCard radius={20} padding="24px">
            <div className={styles.panelTitle} style={{ marginBottom: 14 }}>Riwayat kehadiran</div>
            <div className={styles.histList}>
              {histRows.map((a) => (
                <div key={a.id} className={styles.histRow}>
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
            radius={28}
            padding="22px 24px"
            to="/quran"
            className={styles.quranBanner}
          >
            <div>
              <div className={styles.quranBannerArabic} dir="rtl" lang="ar">
                {quranText('وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا')}
              </div>
              <div className={styles.quranBannerText}>Lanjutkan membaca Al-Qur'an →</div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

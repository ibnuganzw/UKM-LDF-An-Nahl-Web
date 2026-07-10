import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './AgendaDetail.module.css';
import { Badge, Button, GlassCard } from '../components/ui';
import { useAgendas } from '../hooks/useAgendas';
import { useApp } from '../state/AppContext';
import { supabase } from '../lib/supabaseClient';
import { isMemberCurrentlyActive } from '../lib/memberStatus';
import { cx } from '../lib/cx';
import type { Profile } from '../types';

/** Why a logged-in user can't self-register — mirrors the event_registrations
 *  insert RLS check (active member only), so we explain it up front instead of
 *  letting the DB reject the insert with a raw policy-violation error. */
function registrationBlockedReason(profile: Profile | null): string {
  if (!profile) return 'Memuat status keanggotaan…';
  if (profile.status === 'pending') return 'Akunmu masih menunggu persetujuan admin sebelum bisa mendaftar acara.';
  if (profile.status === 'rejected') return 'Keanggotaanmu belum disetujui, jadi belum bisa mendaftar acara. Hubungi pengurus An-Nahl.';
  return 'Keanggotaanmu tercatat sebagai alumni (tidak aktif), jadi pendaftaran acara anggota tidak tersedia.';
}

export default function AgendaDetail() {
  const { id } = useParams<{ id: string }>();
  const { all, refresh } = useAgendas();
  const { session, profile } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const det = all.find((a) => a.id === id);
  const loggedIn = !!session;
  const activeMember =
    !!profile &&
    isMemberCurrentlyActive({
      status: profile.status,
      role: profile.role,
      angkatanYear: profile.angkatanYear,
      academicOverride: profile.academicOverride,
    });

  if (!det) {
    return <div className={styles.page}>Agenda tidak ditemukan.</div>;
  }

  const toggleRegistration = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = det.registered
        ? await supabase.from('event_registrations').delete().eq('agenda_id', det.id).eq('member_id', profile.id)
        : await supabase.from('event_registrations').insert({ agenda_id: det.id, member_id: profile.id });
      if (err) {
        setError(err.message);
        return;
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link to="/agenda" className={styles.back}>← Semua agenda</Link>

      <GlassCard radius={26} borderColor="rgba(232,199,102,.2)" padding="clamp(24px,4vw,38px)" className={styles.panel}>
        <div className={styles.badgeRow}>
          <Badge color={det.typeColor} style={{ fontSize: 11, padding: '5px 13px' }}>{det.type}</Badge>
          <Badge color={det.statusColor} uppercase={false} style={{ fontSize: 12, padding: '5px 13px' }}>{det.statusLabel}</Badge>
          {det.mode === 'universal' && det.qrActive && (
            <Badge color="#5CCBA0" uppercase={false} pulse style={{ fontSize: 12, padding: '5px 13px' }}>
              ● QR absensi aktif
            </Badge>
          )}
          {det.mode === 'registration' && (
            <Badge color="#EE9AC0" uppercase={false} style={{ fontSize: 12, padding: '5px 13px' }}>
              Perlu daftar
            </Badge>
          )}
        </div>

        <h1 className={styles.title}>{det.title}</h1>
        <p className={styles.desc}>{det.description}</p>

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
          {det.mode === 'registration' ? (
            !loggedIn ? (
              <div className={styles.needLoginRow}>
                <span className={styles.needLoginText}>Masuk dulu buat mendaftar acara ini.</span>
                <Button variant="primary" size="sm" to="/login">Masuk</Button>
              </div>
            ) : det.attended ? (
              <div className={styles.attendedRow}>
                <span className={styles.attendedIcon}>✓</span> Kehadiranmu sudah tercatat. Alhamdulillah.
              </div>
            ) : (
              <div className={styles.registerBlock}>
                {det.registered && (
                  <div className={styles.attendedRow}>
                    <span className={styles.attendedIcon}>✓</span> Kamu sudah terdaftar untuk acara ini.
                  </div>
                )}
                {det.registered && (
                  <div className={styles.noQrText}>
                    Absen lewat pindai QR di lokasi acara saat berlangsung — cuma peserta terdaftar yang bisa absen.
                  </div>
                )}
                {det.registered || activeMember ? (
                  <Button
                    variant={det.registered ? 'destructive' : 'primary'}
                    size="md"
                    onClick={toggleRegistration}
                    disabled={busy}
                  >
                    {busy ? 'Memproses…' : det.registered ? 'Batal Daftar' : 'Daftar Acara Ini'}
                  </Button>
                ) : (
                  <div className={styles.noQrText}>{registrationBlockedReason(profile)}</div>
                )}
                {error && <div className={styles.errorText}>{error}</div>}
              </div>
            )
          ) : det.attended && loggedIn ? (
            <div className={styles.attendedRow}>
              <span className={styles.attendedIcon}>✓</span> Kehadiranmu sudah tercatat. Alhamdulillah.
            </div>
          ) : det.qrActive && !loggedIn ? (
            <div className={styles.needLoginRow}>
              <span className={styles.needLoginText}>QR absensi sedang aktif — masuk untuk mencatat kehadiranmu.</span>
              <Button variant="primary" size="sm" to="/login">Masuk</Button>
            </div>
          ) : det.qrActive ? (
            <div className={styles.noQrText}>
              QR absensi sedang aktif — pindai QR di lokasi acara buat mencatat kehadiranmu.
            </div>
          ) : (
            <div className={styles.noQrText}>QR absensi belum dibuka. Admin akan mengaktifkan QR di lokasi saat acara berlangsung.</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

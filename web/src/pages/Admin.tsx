import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Admin.module.css';
import { Badge, GlassCard } from '../components/ui';
import { useApp } from '../state/AppContext';
import { useAgendas } from '../hooks/useAgendas';
import { isAdminRole } from '../lib/roles';
import { supabase } from '../lib/supabaseClient';

export default function Admin() {
  const { profile } = useApp();
  const { upcoming, past, refresh } = useAgendas();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAdminRole(profile);

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <GlassCard radius={26} borderColor="rgba(232,199,102,.2)" className={styles.deniedCard}>
          <div className={styles.deniedTitle}>Khusus admin</div>
          <p className={styles.deniedText}>Halaman ini untuk pengurus yang mengelola agenda & absensi.</p>
        </GlassCard>
      </div>
    );
  }

  const openQr = async (agendaId: string) => {
    setError(null);
    setBusyId(agendaId);
    try {
      const { error: err } = await supabase.rpc('open_agenda_qr', { p_agenda_id: agendaId });
      if (err) {
        setError(err.message);
        return;
      }
      refresh();
      navigate(`/admin/qr/${agendaId}`);
    } finally {
      setBusyId(null);
    }
  };

  const deleteAgenda = async (agendaId: string) => {
    if (!window.confirm('Hapus agenda ini? Data absensi/registrasi terkait ikut terhapus.')) return;
    setError(null);
    const { error: err } = await supabase.from('agendas').delete().eq('id', agendaId);
    if (err) {
      setError(err.message);
      return;
    }
    refresh();
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>Panel Admin</div>
          <h1 className={styles.h1}>Kelola Agenda</h1>
        </div>
        <div className={styles.rowActions}>
          <button className={styles.viewBtn} onClick={() => navigate('/admin/anggota')}>Kelola Anggota</button>
          <button className={styles.viewBtn} onClick={() => navigate('/admin/artikel')}>Kelola Artikel</button>
          <button className={styles.viewBtn} onClick={() => navigate('/admin/struktur')}>Kelola Struktur</button>
          <button className={styles.makeBtn} onClick={() => navigate('/admin/agenda/baru')}>+ Buat Agenda</button>
        </div>
      </div>
      <p className={styles.lead}>
        Agenda mode universal: buat QR, semua anggota aktif bisa absen sendiri lewat scan. Agenda mode registrasi:
        kelola daftar peserta dulu, lalu buat QR — cuma yang terdaftar yang bisa absen (atau tandai hadir manual).
      </p>

      {error && <div className={styles.deniedText} style={{ color: 'var(--danger-text)', marginBottom: 14 }}>{error}</div>}

      <div className={styles.list}>
        {upcoming.map((a) => (
          <GlassCard key={a.id} radius={20} padding="16px 18px" className={styles.row}>
            <div className={styles.rowLeft}>
              <div className={styles.rowBadges}>
                <Badge color={a.typeColor} style={{ padding: '3px 10px' }}>{a.type}</Badge>
                <Badge
                  color={a.mode === 'universal' ? '#8FAAF5' : '#EE9AC0'}
                  uppercase={false}
                  style={{ padding: '3px 10px' }}
                >
                  {a.mode === 'universal' ? 'Universal' : 'Registrasi'}
                </Badge>
                <span className={styles.rowStatus} style={{ color: a.statusColor }}>{a.statusLabel}</span>
              </div>
              <div className={styles.rowTitle}>{a.title}</div>
              <div className={styles.rowMeta}>{a.dateLabel} · {a.timeLabel} · {a.location}</div>
            </div>
            <div className={styles.rowActions}>
              <button className={styles.viewBtn} onClick={() => navigate(`/admin/agenda/${a.id}/edit`)}>Edit</button>
              {a.mode === 'registration' && (
                <button className={styles.viewBtn} onClick={() => navigate(`/admin/agenda/${a.id}/roster`)}>
                  Kelola Peserta
                </button>
              )}
              {a.qrActive ? (
                <>
                  <Badge color="#5CCBA0" uppercase={false} pulse style={{ fontSize: 11.5, padding: '7px 13px' }}>● Aktif</Badge>
                  <button className={styles.viewBtn} onClick={() => navigate(`/admin/qr/${a.id}`)}>Lihat QR</button>
                </>
              ) : (
                <button className={styles.makeBtn} disabled={busyId === a.id} onClick={() => openQr(a.id)}>
                  {busyId === a.id ? 'Memproses…' : 'Buat QR'}
                </button>
              )}
            </div>
          </GlassCard>
        ))}
        {upcoming.length === 0 && <div className={styles.empty}>Belum ada agenda mendatang.</div>}
      </div>

      {past.length > 0 && (
        <>
          <div className={styles.subHeading}>Agenda selesai</div>
          <div className={styles.list}>
            {past.map((a) => (
              <GlassCard key={a.id} radius={20} padding="16px 18px" className={styles.row}>
                <div className={styles.rowLeft}>
                  <div className={styles.rowBadges}>
                    <Badge color={a.typeColor} style={{ padding: '3px 10px' }}>{a.type}</Badge>
                  </div>
                  <div className={styles.rowTitle}>{a.title}</div>
                  <div className={styles.rowMeta}>{a.dateLabel} · {a.location}</div>
                </div>
                <div className={styles.rowActions}>
                  <button className={styles.viewBtn} onClick={() => navigate(`/admin/agenda/${a.id}/edit`)}>Edit</button>
                  <button className={styles.deleteBtn} onClick={() => deleteAgenda(a.id)}>Hapus</button>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

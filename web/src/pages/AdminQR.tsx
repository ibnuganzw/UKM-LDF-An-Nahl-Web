import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import styles from './AdminQR.module.css';
import { useAgendas } from '../hooks/useAgendas';
import { supabase } from '../lib/supabaseClient';

export default function AdminQR() {
  const { id } = useParams<{ id: string }>();
  const { byId, refresh } = useAgendas();
  const navigate = useNavigate();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  const agenda = byId(id);
  // qr_token is no longer selectable from the agendas table (it used to leak to
  // every visitor, letting members check in without attending). Fetch it through
  // the admin-only RPC instead, which is gated by is_active_admin().
  useEffect(() => {
    if (!id) {
      setToken(null);
      setTokenLoading(false);
      return;
    }
    let cancelled = false;
    setTokenLoading(true);
    (async () => {
      const { data } = await supabase.rpc('get_agenda_qr_token', { p_agenda_id: id });
      if (!cancelled) {
        setToken((data as string | null) ?? null);
        setTokenLoading(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setToken(null);
        setTokenLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const scanUrl = id && token ? `${window.location.origin}/scan/${id}?token=${token}` : null;

  useEffect(() => {
    if (!scanUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(scanUrl, { width: 320, margin: 2, color: { dark: '#241B04', light: '#F5EFDC' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [scanUrl]);

  const closeQr = async () => {
    if (!agenda) return;
    await supabase.rpc('close_agenda_qr', { p_agenda_id: agenda.id });
    refresh();
    navigate('/admin');
  };

  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.back}>← Panel admin</Link>

      <div className={styles.card}>
        <span className={styles.activeBadge}>● QR absensi aktif</span>
        <div className={styles.title}>{agenda?.title}</div>
        <div className={styles.meta}>{agenda ? `${agenda.dateLabel} · ${agenda.timeLabel} · ${agenda.location}` : ''}</div>

        <div className={styles.qrImageWrap}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR absensi" className={styles.qrImage} />
          ) : (
            <span className={styles.qrPlaceholder}>
              {tokenLoading || token ? 'Memuat QR…' : 'QR belum aktif. Buka QR dari panel admin dulu.'}
            </span>
          )}
        </div>

        {scanUrl && <div className={styles.code}>{scanUrl}</div>}
        <div className={styles.disclaimer}>
          Tampilkan atau cetak QR ini di lokasi acara. Anggota tinggal pindai pakai kamera HP — otomatis tercatat
          kalau lagi login. Berlaku sampai dinonaktifkan atau beberapa jam setelah acara selesai.
          {agenda?.mode === 'registration' && ' Khusus agenda ini, cuma yang sudah terdaftar yang bisa absen lewat QR — yang belum daftar akan ditolak.'}
        </div>
        <button className={styles.killBtn} onClick={closeQr}>
          Nonaktifkan QR
        </button>
      </div>
    </div>
  );
}

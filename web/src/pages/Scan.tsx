import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styles from './Scan.module.css';
import { useApp } from '../state/AppContext';
import { supabase } from '../lib/supabaseClient';

type ScanState = 'checking' | 'success' | 'fail' | 'need-login';

export default function Scan() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { session, authLoading } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<ScanState>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState('need-login');
      return;
    }
    if (!id || !token) {
      setState('fail');
      setMessage('Link absensi tidak valid.');
      return;
    }
    let cancelled = false;
    (async () => {
      const { error } = await supabase.rpc('check_in', { p_agenda_id: id, p_token: token });
      if (cancelled) return;
      if (error) {
        setState('fail');
        setMessage(error.message);
        return;
      }
      setState('success');
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, session, id, token]);

  const loginRedirect = `/login?redirect=${encodeURIComponent(`/scan/${id ?? ''}?token=${token ?? ''}`)}`;

  return (
    <div className={styles.page}>
      <Link to="/dashboard" className={styles.back}>← Kembali</Link>

      <div className={styles.card}>
        <div className={styles.eyebrow}>Absensi QR</div>

        {state === 'checking' && (
          <div className={styles.resultBlock}>
            <div className={styles.resultTitle}>Memproses…</div>
            <p className={styles.resultText}>Sebentar, lagi dicatat.</p>
          </div>
        )}

        {state === 'need-login' && (
          <div className={styles.resultBlock}>
            <div className={styles.resultTitle}>Masuk dulu, yuk</div>
            <p className={styles.resultText}>Kamu perlu masuk buat mencatat kehadiran lewat QR ini.</p>
            <Link to={loginRedirect} className={styles.resultCta}>Masuk</Link>
          </div>
        )}

        {state === 'success' && (
          <div className={styles.resultBlock}>
            <div className={styles.resultIconOuter} style={{ background: 'rgba(92,203,160,.12)' }}>
              <div
                className={styles.resultIconInner}
                style={{ background: 'linear-gradient(135deg,#5CCBA0,#2E9C77)', color: '#06281C', boxShadow: '0 0 30px rgba(92,203,160,.4)' }}
              >
                ✓
              </div>
            </div>
            <div className={styles.resultTitle}>Alhamdulillah, tercatat!</div>
            <p className={styles.resultText}>
              Kehadiranmu pada agenda ini sudah masuk ke riwayat. Jazakumullahu khairan sudah hadir.
            </p>
            <button className={styles.resultCta} onClick={() => navigate('/dashboard')}>Kembali ke Dashboard</button>
          </div>
        )}

        {state === 'fail' && (
          <div className={styles.resultBlock}>
            <div className={styles.resultIconOuter} style={{ background: 'rgba(229,138,138,.1)' }}>
              <div className={styles.resultIconInner} style={{ background: '#C0524A', color: '#fff' }}>✕</div>
            </div>
            <div className={styles.resultTitle}>Absen gagal</div>
            <p className={styles.resultText}>{message}</p>
            <div className={styles.resultRow}>
              <button className={styles.dashboardBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

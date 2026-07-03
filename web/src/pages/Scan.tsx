import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './Scan.module.css';
import { useAgendas } from '../hooks/useAgendas';
import { useApp } from '../state/AppContext';
import { cx } from '../lib/cx';

type ScanState = 'idle' | 'scanning' | 'success' | 'fail';

export default function Scan() {
  const { id } = useParams<{ id: string }>();
  const { byId } = useAgendas();
  const { checkIn } = useApp();
  const navigate = useNavigate();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const timeoutRef = useRef<number | undefined>(undefined);

  const agenda = byId(id);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const doScan = () => {
    if (scanState === 'scanning') return;
    setScanState('scanning');
    timeoutRef.current = window.setTimeout(() => {
      setScanState(checkIn(id ?? '') ? 'success' : 'fail');
    }, 1600);
  };

  const scanning = scanState === 'scanning';

  return (
    <div className={styles.page}>
      <Link to="/dashboard" className={styles.back}>← Kembali</Link>

      <div className={styles.card}>
        <div className={styles.eyebrow}>Absensi QR</div>
        <div className={styles.title}>{agenda ? agenda.title : 'Pilih agenda dari dashboard'}</div>
        <div className={styles.meta}>{agenda ? `${agenda.relLabel} · ${agenda.time} · ${agenda.location}` : ''}</div>

        {(scanState === 'idle' || scanning) && (
          <>
            <div className={styles.viewfinder}>
              <div className={cx(styles.bracket, styles.bracketTL)} />
              <div className={cx(styles.bracket, styles.bracketTR)} />
              <div className={cx(styles.bracket, styles.bracketBL)} />
              <div className={cx(styles.bracket, styles.bracketBR)} />
              <div className={styles.watermark} />
              {scanning && <div className={styles.scanline} />}
              <div className={styles.viewfinderHint}>{scanning ? 'Mencari QR…' : 'Arahkan kamera ke QR yang ditampilkan admin'}</div>
            </div>
            <button
              className={styles.scanBtn}
              style={{ background: scanning ? '#5E6B8F' : '#1F8A63' }}
              onClick={doScan}
            >
              {scanning ? 'Memindai…' : 'Simulasikan Pindai QR'}
            </button>
            <div className={styles.disclaimer}>Simulasi pemindaian — di versi penuh, kamera HP memindai QR yang ditampilkan admin di lokasi.</div>
          </>
        )}

        {scanState === 'success' && (
          <div className={styles.resultBlock}>
            <div className={styles.resultIconOuter} style={{ background: 'rgba(92,203,160,.12)' }}>
              <div className={styles.resultIconInner} style={{ background: 'linear-gradient(135deg,#5CCBA0,#2E9C77)', color: '#06281C', boxShadow: '0 0 30px rgba(92,203,160,.4)' }}>✓</div>
            </div>
            <div className={styles.resultTitle}>Alhamdulillah, tercatat!</div>
            <p className={styles.resultText}>Kehadiranmu pada agenda ini sudah masuk ke riwayat. Jazakumullahu khairan sudah hadir.</p>
            <button className={styles.resultCta} onClick={() => navigate('/dashboard')}>Kembali ke Dashboard</button>
          </div>
        )}

        {scanState === 'fail' && (
          <div className={styles.resultBlock}>
            <div className={styles.resultIconOuter} style={{ background: 'rgba(229,138,138,.1)' }}>
              <div className={styles.resultIconInner} style={{ background: '#C0524A', color: '#fff' }}>✕</div>
            </div>
            <div className={styles.resultTitle}>QR belum aktif</div>
            <p className={styles.resultText}>Admin belum membuka QR absensi untuk agenda ini. Absen hanya bisa dilakukan di lokasi saat QR ditampilkan.</p>
            <div className={styles.resultRow}>
              <button className={styles.retryBtn} onClick={() => setScanState('idle')}>Coba lagi</button>
              <button className={styles.dashboardBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import { Button } from '../components/ui';
import { useApp } from '../state/AppContext';

export default function PendingApproval() {
  const { session, profile, authLoading, profileLoading, refreshProfile, logout } = useApp();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authLoading || (session && profileLoading)) return;
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }
    if (profile?.status === 'active') {
      navigate('/dashboard', { replace: true });
    }
  }, [session, profile, authLoading, profileLoading, navigate]);

  const doRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const doLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  if (authLoading || (session && profileLoading) || !profile) return null;

  const isRejected = profile.status === 'rejected';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>{isRejected ? 'Pendaftaran ditolak' : 'Menunggu persetujuan'}</h1>
          <div className={styles.subtitle}>
            {isRejected
              ? 'Pendaftaran kamu belum disetujui admin. Hubungi pengurus An-Nahl untuk info lebih lanjut.'
              : 'Akun kamu sudah terdaftar dan menunggu persetujuan admin sebelum bisa mengakses dashboard & absensi.'}
          </div>
        </div>
        <div className={styles.form}>
          <Button variant="secondary" fullWidth className={styles.submitBtn} onClick={doRefresh} disabled={refreshing}>
            {refreshing ? 'Memeriksa…' : 'Cek status'}
          </Button>
          <Button variant="destructive" fullWidth className={styles.submitBtn} onClick={doLogout}>
            Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}

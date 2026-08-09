import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { isAdminRole } from '../lib/roles';
import styles from './RouteGuards.module.css';

function GateState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <main className={styles.page} role={onRetry ? 'alert' : 'status'}>
      <section className={styles.card}>
        <h1>{title}</h1>
        <p>{body}</p>
        {onRetry && <button type="button" onClick={onRetry}>Coba lagi</button>}
      </section>
    </main>
  );
}

/** Dashboard / Scan require a logged-in, approved member. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, authLoading, profileLoading, refreshProfile } = useApp();
  if (authLoading || (session && profileLoading)) {
    return <GateState title="Menyiapkan akun…" body="Kami sedang memeriksa sesi dan status keanggotaanmu." />;
  }
  if (!session) return <Navigate to="/login" replace />;
  // Profile finished loading but is missing (e.g. a transient fetch failure).
  // Don't render the authenticated shell to someone whose status we can't
  // confirm — a pending member must not slip past the approval gate on a failed
  // profile read. Rare, and the app is already degraded when it happens.
  if (!profile) {
    return (
      <GateState
        title="Status keanggotaan belum dapat diperiksa."
        body="Akses ditahan sampai profil berhasil diverifikasi. Tidak ada izin yang diberikan dari status kosong."
        onRetry={() => void refreshProfile()}
      />
    );
  }
  if (profile.status !== 'active') return <Navigate to="/menunggu-persetujuan" replace />;
  return <>{children}</>;
}

/** Admin-only pages. Bounces non-admins back to the Panel Admin, which has its own "denied" state. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, authLoading, profileLoading, refreshProfile } = useApp();
  if (authLoading || (session && profileLoading)) {
    return <GateState title="Memeriksa akses admin…" body="Kami sedang memverifikasi sesi dan peran akunmu." />;
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <GateState
        title="Peran akun belum dapat diperiksa."
        body="Halaman admin tetap terkunci sampai profil berhasil diverifikasi."
        onRetry={() => void refreshProfile()}
      />
    );
  }
  if (!isAdminRole(profile)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

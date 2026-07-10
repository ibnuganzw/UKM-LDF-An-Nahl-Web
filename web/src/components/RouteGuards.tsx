import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { isAdminRole } from '../lib/roles';

/** Dashboard / Scan require a logged-in, approved member. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, authLoading, profileLoading } = useApp();
  if (authLoading || (session && profileLoading)) return null;
  if (!session) return <Navigate to="/login" replace />;
  // Profile finished loading but is missing (e.g. a transient fetch failure).
  // Don't render the authenticated shell to someone whose status we can't
  // confirm — a pending member must not slip past the approval gate on a failed
  // profile read. Rare, and the app is already degraded when it happens.
  if (!profile) return null;
  if (profile.status !== 'active') return <Navigate to="/menunggu-persetujuan" replace />;
  return <>{children}</>;
}

/** Admin-only pages. Bounces non-admins back to the Panel Admin, which has its own "denied" state. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, authLoading, profileLoading } = useApp();
  if (authLoading || (session && profileLoading)) return null;
  if (!session || !isAdminRole(profile)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

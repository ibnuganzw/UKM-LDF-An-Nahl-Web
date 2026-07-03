import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';

/** Dashboard / Scan require a logged-in member. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Admin QR view has no documented "denied" state of its own — bounce non-admins back to the Panel Admin, which does. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useApp();
  if (!user || user.role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

import type { Profile } from '../types';

/** Mirrors the database's private.is_active_admin() check on the client. */
export function isAdminRole(profile: Profile | null | undefined): boolean {
  return !!profile && (profile.role === 'admin' || profile.role === 'super_admin') && profile.status === 'active';
}

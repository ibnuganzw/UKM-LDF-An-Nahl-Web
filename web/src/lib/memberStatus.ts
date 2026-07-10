import type { AcademicStatus, MembershipStatus, UserRole } from '../types';

interface ActivityInput {
  status: MembershipStatus;
  role: UserRole;
  angkatanYear: number;
  academicOverride: AcademicStatus | null;
}

/**
 * Mirrors the database's public.is_member_currently_active() for instant
 * client-side display. The SQL function remains authoritative for anything
 * that gates access or filters a roster.
 */
export function isMemberCurrentlyActive(m: ActivityInput): boolean {
  if (m.status !== 'active') return false;
  if (m.role === 'super_admin') return true;
  if (m.academicOverride !== null) return m.academicOverride === 'active';
  return new Date().getFullYear() < m.angkatanYear + 4;
}

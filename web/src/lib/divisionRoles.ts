import type { DivisionRole } from '../types';

/** Human labels for each division role, shown in the admin dropdown and as the
 *  role caption on the public org chart. */
export const DIVISION_ROLE_LABELS: Record<DivisionRole, string> = {
  ketua: 'Ketua Divisi',
  wakil: 'Wakil Ketua',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota',
};

/** Every role, in the order the admin dropdown lists them (top of the hierarchy
 *  first). */
export const DIVISION_ROLES: DivisionRole[] = ['ketua', 'wakil', 'sekretaris', 'bendahara', 'anggota'];

/** The officer roles that sit in the middle band of the chart — between the
 *  ketua divisi and the anggota — in canonical left-to-right order. This is the
 *  "analisa nama jabatan" that keeps the officer boxes aligned across divisions. */
export const OFFICER_ROLES: DivisionRole[] = ['wakil', 'sekretaris', 'bendahara'];

/** Sort weight so a mixed list of members lays out head → officers → anggota. */
export const ROLE_ORDER: Record<DivisionRole, number> = {
  ketua: 0,
  wakil: 1,
  sekretaris: 2,
  bendahara: 3,
  anggota: 4,
};

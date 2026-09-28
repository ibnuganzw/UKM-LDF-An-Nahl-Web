import { describe, expect, it } from 'vitest';
import { parseOrgStructureText, validateOrgStructureImport } from './orgStructureImport';

const SAMPLE = `Ketua Umum: Althaf Khadhi Bendahara umum: Misla Husnika Sekretaris umum: Said Farid Adillah Assegaf
1. Divisi Kaderisasi &Study club: Kadiv: Hasan Yusuf Abdurrahman Sekdiv: Triya Ariyani Anggota: 1. Zetia Medina Aisya 2. Anindya Agustiani 3. Rizki Aryanda
2. Divisi Syiar dan PM: Kadiv: Elliza Sekdiv: Ayu Novila Anggota: 1. Ilyas Al Atsary 2. Rabiatul Addawiya
3. Divisi BKKM, Mapala, dan Media: Kadiv: Ibnu Hakim Wakadiv: Nur Hidayah Bendiv: Ajijah Nasution Anggota: 1. Arya Ardiansyah`;

describe('organisation DOCX import parser', () => {
  it('extracts core leadership, divisions, and people from a plain Word paragraph', () => {
    const draft = parseOrgStructureText(SAMPLE);

    expect(draft.core.ketua_umum?.name).toBe('Althaf Khadhi');
    expect(draft.core.sekretaris_umum?.name).toBe('Said Farid Adillah Assegaf');
    expect(draft.core.bendahara_umum?.name).toBe('Misla Husnika');
    expect(draft.core.dosen_pembina).toBeUndefined();

    expect(draft.divisions).toHaveLength(3);
    expect(draft.divisions[0]?.name).toBe('Kaderisasi & Study club');
    expect(draft.divisions[0]?.members).toEqual([
      { role: 'ketua', name: 'Hasan Yusuf Abdurrahman' },
      { role: 'sekretaris', name: 'Triya Ariyani' },
      { role: 'anggota', name: 'Zetia Medina Aisya' },
      { role: 'anggota', name: 'Anindya Agustiani' },
      { role: 'anggota', name: 'Rizki Aryanda' },
    ]);
    expect(draft.divisions[2]?.members).toEqual([
      { role: 'ketua', name: 'Ibnu Hakim' },
      { role: 'wakil', name: 'Nur Hidayah' },
      { role: 'bendahara', name: 'Ajijah Nasution' },
      { role: 'anggota', name: 'Arya Ardiansyah' },
    ]);
  });

  it('blocks a malformed preview instead of letting it overwrite the active structure', () => {
    const draft = parseOrgStructureText('Divisi Syiar: Kadiv: A Kadiv: B');
    const issues = validateOrgStructureImport(draft);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 'error', message: expect.stringContaining('lebih dari satu ketua') }),
    ]));
  });
});

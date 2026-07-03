import type { MisiItem, SejarahItem, StrukturDeptItem, StrukturIntiItem } from '../types';

export const SEJARAH_ITEMS: SejarahItem[] = [
  { title: '20XX — Cikal bakal', text: 'Berawal dari halaqah kecil mahasiswa FKH yang rindu suasana mushalla hidup. (Placeholder — isi dengan sejarah asli.)' },
  { title: '20XX — Resmi berdiri', text: 'Dikukuhkan sebagai UKM Lembaga Dakwah Fakultas di FKH USK. (Placeholder.)' },
  { title: 'Hari ini', text: 'Terus bergerak melalui kajian, kaderisasi, media, dan pelayanan mushalla — satu sarang, satu tujuan.' },
];

export const MISI_LIST: MisiItem[] = [
  { n: 1, text: 'Menghidupkan syiar Islam di lingkungan FKH USK. (contoh)' },
  { n: 2, text: 'Membina anggota melalui mentoring dan kaderisasi berjenjang. (contoh)' },
  { n: 3, text: 'Menebar manfaat melalui media, kajian, dan kegiatan sosial. (contoh)' },
  { n: 4, text: 'Menjadi wadah ukhuwah bagi seluruh civitas muslim FKH. (contoh)' },
];

export const VISI_TEXT = 'Terwujudnya generasi dokter hewan muslim yang beriman, berilmu, dan bermanfaat bagi umat.';

export const KETUA_UMUM = { name: 'Nama Ketua Umum', role: 'Ketua Umum', initial: 'K' };

export const STRUKTUR_INTI: StrukturIntiItem[] = [
  { role: 'Sekretaris Umum', name: 'Nama Pengurus', initial: 'S' },
  { role: 'Bendahara Umum', name: 'Nama Pengurus', initial: 'B' },
];

const DEPTS: [string, string, string][] = [
  ['Kaderisasi', 'Mentoring pekanan & pembinaan anggota berjenjang.', '#5CCBA0'],
  ['Syiar', 'Kajian rutin, PHBI, dan dakwah kreatif kampus.', '#8FAAF5'],
  ['Media & Informasi', 'Konten dakwah, publikasi, dan pengelolaan media sosial.', '#5FC6DE'],
  ['Dana & Usaha', 'Kemandirian finansial melalui usaha halal.', '#E8C766'],
  ['Kemuslimahan', 'Pembinaan dan kegiatan khusus muslimah FKH.', '#EE9AC0'],
  ['Biro Kemushallaan', 'Kemakmuran, kebersihan, dan fasilitas mushalla.', '#C39BE8'],
];

export const STRUKTUR_DEPT: StrukturDeptItem[] = DEPTS.map(([name, desc, color]) => ({
  name,
  desc,
  color,
  initial: name.charAt(0),
}));

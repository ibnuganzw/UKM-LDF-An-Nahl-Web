export type AgendaType =
  | 'Kajian'
  | 'Rapat'
  | 'Mentoring'
  | 'Sosial'
  | 'Olahraga'
  | 'Rihlah'
  | 'Open Recruitment';

export interface Agenda {
  id: string;
  title: string;
  type: AgendaType;
  /** Day offset from today (0 = today, negative = past). Resolved to a Date at read time. */
  dayOffset: number;
  time: string;
  end: string;
  location: string;
  pj: string;
  pemateri?: string;
  desc: string;
}

export type AgendaStatus = 'Selesai' | 'Hari ini' | 'Akan datang';

export interface EnrichedAgenda extends Agenda {
  date: Date;
  typeColor: string;
  dateLabel: string;
  dayNum: number;
  monShort: string;
  relLabel: string;
  statusLabel: AgendaStatus;
  statusColor: string;
  timeLabel: string;
  hasPemateri: boolean;
  footerLabel: string;
  qrActive: boolean;
  attended: boolean;
}

export type ArticleCategory = 'Islam Veteriner' | 'Kisah' | 'Renungan';

export interface Article {
  id: string;
  cat: ArticleCategory;
  title: string;
  mins: number;
  excerpt: string;
  body: string[];
}

export interface Surah {
  no: number;
  name: string;
  ar: string;
  arti: string;
  ayat: number;
  tempat: 'Makkiyah' | 'Madaniyah';
  ready?: boolean;
  special?: boolean;
}

export interface Ayat {
  n: number;
  ar: string;
  id: string;
}

export type UserRole = 'member' | 'admin';

export interface AuthUser {
  name: string;
  role: UserRole;
}

export interface AttendanceRecord {
  id: string;
  ts: number;
}

export type QRSessionMap = Record<string, string>;

export interface SejarahItem {
  title: string;
  text: string;
}

export interface MisiItem {
  n: number;
  text: string;
}

export interface StrukturIntiItem {
  role: string;
  name: string;
  initial: string;
}

export interface StrukturDeptItem {
  name: string;
  desc: string;
  color: string;
  initial: string;
}

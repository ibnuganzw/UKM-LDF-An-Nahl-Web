export type AgendaType =
  | 'Kajian'
  | 'Rapat'
  | 'Mentoring'
  | 'Sosial'
  | 'Olahraga'
  | 'Rihlah'
  | 'Open Recruitment';

/** universal = applies to all active members automatically, no sign-up.
 *  registration = opt-in roster, admin can also add/remove people manually. */
export type AgendaMode = 'universal' | 'registration';

export interface Agenda {
  id: string;
  title: string;
  type: AgendaType;
  mode: AgendaMode;
  /** ISO date, e.g. '2026-07-15'. */
  eventDate: string;
  /** 'HH:MM' (24h). */
  startTime: string;
  endTime: string;
  location: string;
  pj: string;
  pemateri: string | null;
  description: string;
  /** Set while a check-in session is open; null otherwise. Drives the "QR aktif"
   *  UI. The raw qr_token is deliberately NOT exposed here — it is not selectable
   *  from the agendas table (would let members check in without attending) and is
   *  only fetched by the admin QR page via the get_agenda_qr_token RPC. */
  qrOpenedAt: string | null;
  createdBy: string | null;
  createdAt: string;
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
  /** Current logged-in user's own check-in status for this agenda. */
  attended: boolean;
  /** Current logged-in user's own registration status (registration-mode only). */
  registered: boolean;
}

export type ArticleCategory = 'Islam Veteriner' | 'Kisah' | 'Renungan';
export type ArticleStatus = 'draft' | 'published';

export interface Article {
  id: string;
  slug: string;
  cat: ArticleCategory;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string | null;
  status: ArticleStatus;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface EnrichedArticle extends Article {
  /** Estimated reading time in minutes, computed from contentHtml. */
  mins: number;
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

/** Depth of the encyclopedic write-up available for a surah. 'ringkas' entries are
 * candidates for a future enrichment pass — see [[quran-surah-info-schema]] memory. */
export type SurahInfoTier = 'lengkap' | 'ringkas';

export interface SurahInfoRange {
  dari: number;
  sampai: number;
}

export interface SurahInfoAyatOverview {
  rentang: string;
  fokus: string;
}

export interface SurahInfoStruktur {
  bagian: string;
  rentang: string;
  tema: string;
  keterkaitan: string;
}

export interface SurahInfoKandungan {
  kategori: string;
  isi: string;
}

export interface SurahInfoAyatKunci {
  ayat: string;
  makna: string;
  catatan: string;
}

/** Standardized encyclopedic profile for a surah, keyed by Surah.no. Does not
 * repeat fields already on Surah (name/ar/arti/ayat/tempat) — join on `no`. */
export interface SurahInfo {
  no: number;
  namaLain: string[];
  urutanTurun: number;
  juz: SurahInfoRange;
  /** Nuance for surahs whose tempat is disputed/transitional (e.g. Ar-Rahman, Al-Mutaffifin, Al-Ma'un). */
  tempatTurunCatatan?: string;
  temaUtama: string;
  konteksTurun: string;
  asbabunNuzul: string;
  alasanPenamaan: string;
  gambaranIsi: SurahInfoAyatOverview[];
  strukturSurat: SurahInfoStruktur[];
  pokokKandungan: SurahInfoKandungan[];
  ayatKunci: SurahInfoAyatKunci[];
  keutamaan: string;
  faktaMenarik: string;
  munasabah: string;
  pesanPraktis: string;
  pertanyaanTadabbur: string;
  catatanIkhtilaf: string;
  ringkasanSingkat: string;
  sumberRujukan: string[];
  tier: SurahInfoTier;
}

export interface Juz {
  juz_number: number;
  verse_mapping: Record<string, string>;
  first_verse_id: number;
  last_verse_id: number;
  verses_count: number;
}

export interface Ayat {
  n: number;
  ar: string;
  latin: string;
  id: string;
}

export type QuranScript = 'uthmani' | 'indopak';

export interface QuranVerse {
  id: number;
  verse_key: string;
  chapter_id: number;
  verse_number: number;
  juz_number?: number;
  hizb_number?: number;
  rub_el_hizb_number?: number;
  page_number?: number;
  text_uthmani: string;
  text_indopak: string;
  text_uthmani_tajweed: string;
  code_v2?: string;
  v2_page?: number;
  transliteration?: string;
  translation_id?: string;
}

export interface QuranVerseSupplement {
  chapter_id?: number;
  verse_number: number;
  transliteration?: string;
  translation_id?: string;
}

export type QuranSearchMode = 'all' | 'lafaz' | 'translation';

export interface QuranSearchResult {
  verse_key: string;
  chapter_id: number;
  verse_number: number;
  text_uthmani: string;
  transliteration: string;
  translation_id: string;
  score: number;
  matched_fields: Array<'lafaz' | 'translation' | 'arabic'>;
}

export interface QuranSearchResponse {
  query: string;
  mode: QuranSearchMode;
  respectVowels: boolean;
  totalVerses: number;
  results: QuranSearchResult[];
}

export interface QuranReaderSettings {
  script: QuranScript;
  tajweedEnabled: boolean;
  arabicFontSize: number;
  showLatin: boolean;
  showTranslation: boolean;
  reciter: string;
}

export type UserRole = 'member' | 'admin' | 'super_admin';
export type MembershipStatus = 'pending' | 'active' | 'rejected';
export type AcademicStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
  name: string;
  nim: string;
  angkatanYear: number;
  role: UserRole;
  status: MembershipStatus;
  academicOverride: AcademicStatus | null;
  createdAt: string;
}

export interface SejarahItem {
  title: string;
  text: string;
}

export interface MisiItem {
  n: number;
  text: string;
}

export type OrgPositionKey = 'dosen_pembina' | 'ketua_umum' | 'sekretaris_umum' | 'bendahara_umum';

/** Core rows (positionKey set) have exactly one row each, protected from
 *  deletion/re-keying at the DB level. Divisi rows (positionKey null) are a
 *  flexible, admin-managed list — name is the division's own name for those. */
export interface OrgPosition {
  id: string;
  positionKey: OrgPositionKey | null;
  tier: number;
  name: string;
  roleTitle: string | null;
  divisionDesc: string | null;
  divisionColor: string | null;
  photoUrl: string | null;
  sortOrder: number;
  createdAt: string;
}

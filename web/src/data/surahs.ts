import type { Ayat, Surah } from '../types';

export const SURAHS: Surah[] = [
  { no: 1, name: 'Al-Fatihah', ar: 'الفاتحة', arti: 'Pembukaan', ayat: 7, tempat: 'Makkiyah', ready: true },
  { no: 2, name: 'Al-Baqarah', ar: 'البقرة', arti: 'Sapi Betina', ayat: 286, tempat: 'Madaniyah' },
  { no: 16, name: 'An-Nahl', ar: 'النحل', arti: 'Lebah', ayat: 128, tempat: 'Makkiyah', special: true },
  { no: 18, name: 'Al-Kahf', ar: 'الكهف', arti: 'Gua', ayat: 110, tempat: 'Makkiyah' },
  { no: 36, name: 'Yasin', ar: 'يس', arti: 'Yasin', ayat: 83, tempat: 'Makkiyah' },
  { no: 55, name: 'Ar-Rahman', ar: 'الرحمن', arti: 'Maha Pengasih', ayat: 78, tempat: 'Madaniyah' },
  { no: 67, name: 'Al-Mulk', ar: 'الملك', arti: 'Kerajaan', ayat: 30, tempat: 'Makkiyah' },
  { no: 112, name: 'Al-Ikhlas', ar: 'الإخلاص', arti: 'Ikhlas', ayat: 4, tempat: 'Makkiyah' },
];

/** Only Al-Fatihah has real ayat text loaded in this prototype (see handoff README). */
export const AL_FATIHAH: Ayat[] = [
  { n: 1, ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', id: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.' },
  { n: 2, ar: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', id: 'Segala puji bagi Allah, Tuhan seluruh alam.' },
  { n: 3, ar: 'الرَّحْمَٰنِ الرَّحِيمِ', id: 'Yang Maha Pengasih, Maha Penyayang.' },
  { n: 4, ar: 'مَالِكِ يَوْمِ الدِّينِ', id: 'Pemilik hari pembalasan.' },
  { n: 5, ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', id: 'Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami mohon pertolongan.' },
  { n: 6, ar: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', id: 'Tunjukilah kami jalan yang lurus.' },
  {
    n: 7,
    ar: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    id: '(Yaitu) jalan orang-orang yang telah Engkau beri nikmat; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat.',
  },
];

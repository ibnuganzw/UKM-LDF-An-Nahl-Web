export type NavGroup = 'home' | 'agenda' | 'profil' | 'shalat' | 'quran' | 'konten' | 'akun';

export const NAV_LINKS: { label: string; to: string; group: NavGroup }[] = [
  { label: 'Beranda', to: '/', group: 'home' },
  { label: 'Agenda', to: '/agenda', group: 'agenda' },
  { label: "Al-Qur'an", to: '/quran', group: 'quran' },
  { label: 'Konten', to: '/konten', group: 'konten' },
  { label: 'Shalat', to: '/shalat', group: 'shalat' },
  { label: 'Profil', to: '/profil', group: 'profil' },
];

export function getNavGroup(pathname: string): NavGroup {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/agenda')) return 'agenda';
  if (pathname.startsWith('/profil')) return 'profil';
  if (pathname.startsWith('/shalat')) return 'shalat';
  if (pathname.startsWith('/quran')) return 'quran';
  if (pathname.startsWith('/konten')) return 'konten';
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/scan')
  ) {
    return 'akun';
  }
  return 'home';
}

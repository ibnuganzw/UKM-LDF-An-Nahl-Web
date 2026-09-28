import { Link, useLocation } from 'react-router-dom';
import styles from './BottomNav.module.css';
import { useApp } from '../../state/AppContext';
import { getNavGroup } from '../../lib/nav';
import { cx } from '../../lib/cx';
import { isAdminRole } from '../../lib/roles';

type IconName = 'home' | 'calendar' | 'quran' | 'clock' | 'user';

function NavIcon({ name }: { name: IconName }) {
  const common = {
    className: styles.icon,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'home') {
    return <svg {...common}><path d="m3.5 10.5 8.5-7 8.5 7" /><path d="M5.5 9v11h13V9" /><path d="M9.5 20v-6h5v6" /></svg>;
  }
  if (name === 'calendar') {
    return <svg {...common}><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M3.5 10h17" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" /></svg>;
  }
  if (name === 'quran') {
    return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23Z" /></svg>;
  }
  if (name === 'clock') {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" /></svg>;
}

export function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const { profile } = useApp();
  const location = useLocation();
  const group = getNavGroup(location.pathname);
  const accountRoute = profile ? (isAdminRole(profile) ? '/admin' : '/dashboard') : '/login';

  const items: { label: string; to: string; group: string; icon: IconName }[] = [
    { label: 'Beranda', to: '/', group: 'home', icon: 'home' },
    { label: 'Agenda', to: '/agenda', group: 'agenda', icon: 'calendar' },
    { label: "Qur'an", to: '/quran', group: 'quran', icon: 'quran' },
    { label: 'Shalat', to: '/shalat', group: 'shalat', icon: 'clock' },
    { label: 'Akun', to: accountRoute, group: 'akun', icon: 'user' },
  ];

  return (
    <nav className={cx(styles.nav, hidden && styles.navHidden)} aria-label="Navigasi utama mobile">
      {items.map((item) => {
        const active = item.group === group;
        return (
          <Link
            key={item.label}
            to={item.to}
            className={cx(styles.item, active && styles.itemActive)}
            aria-current={active ? 'page' : undefined}
          >
            <NavIcon name={item.icon} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';
import styles from './BottomNav.module.css';
import { Hex } from '../ui';
import { useApp } from '../../state/AppContext';
import { getNavGroup } from '../../lib/nav';
import { cx } from '../../lib/cx';

export function BottomNav() {
  const { user } = useApp();
  const location = useLocation();
  const group = getNavGroup(location.pathname);
  const accountRoute = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login';

  const items: { label: string; to: string; group: string }[] = [
    { label: 'Beranda', to: '/', group: 'home' },
    { label: 'Agenda', to: '/agenda', group: 'agenda' },
    { label: "Qur'an", to: '/quran', group: 'quran' },
    { label: 'Konten', to: '/konten', group: 'konten' },
    { label: 'Akun', to: accountRoute, group: 'akun' },
  ];

  return (
    <nav className={styles.nav}>
      {items.map((item) => {
        const active = item.group === group;
        return (
          <Link key={item.label} to={item.to} className={styles.item}>
            <Hex width={9} height={10} bg={active ? '#E8C766' : 'rgba(255,255,255,.28)'} />
            <span className={cx(styles.label, active && styles.labelActive)}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

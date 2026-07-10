import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';
import { Hex } from '../ui';
import { useApp } from '../../state/AppContext';
import { NAV_LINKS, getNavGroup } from '../../lib/nav';
import { cx } from '../../lib/cx';
import { isAdminRole } from '../../lib/roles';

export function Header() {
  const { profile } = useApp();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const group = getNavGroup(location.pathname);
  const isAdmin = isAdminRole(profile);
  const accountRoute = profile ? (isAdmin ? '/admin' : '/dashboard') : '/login';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const menuLinks = [
    ...NAV_LINKS,
    ...(isAdmin ? [{ label: 'Panel Admin', to: '/admin', group: 'akun' as const }] : []),
    ...(profile ? [{ label: 'Dashboard', to: '/dashboard', group: 'akun' as const }] : []),
  ];

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <img src="/assets/logo.png" alt="Logo LDF An-Nahl" className={styles.logo} />
          <div className={styles.brandText}>
            <div className={styles.brandName}>LDF An-Nahl</div>
            <div className={styles.brandSub}>FKH USK</div>
          </div>
        </Link>

        <nav className={styles.desktopNav}>
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={cx(styles.navLink, group === l.group && styles.navLinkActive)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.right}>
          {profile ? (
            <Link to={accountRoute} className={styles.accountPill}>
              <Hex width={34} height={34} bg="linear-gradient(135deg,#E8C766,#C9A227)" color="#241B04" fontSize={14}>
                {profile.name.charAt(0).toUpperCase()}
              </Hex>
              <span className={styles.accountName}>{profile.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link to="/login" className={styles.loginBtn}>
              Masuk
            </Link>
          )}
          <button className={styles.hamburger} aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
            <span className={styles.hamburgerBar} />
            <span className={styles.hamburgerBar} />
            <span className={styles.hamburgerBarShort} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          {menuLinks.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className={cx(styles.mobileMenuLink, group === l.group && styles.mobileMenuLinkActive)}
            >
              <Hex width={7} height={8} bg={group === l.group ? '#E8C766' : 'rgba(255,255,255,.25)'} />
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

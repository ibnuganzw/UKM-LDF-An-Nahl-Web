import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { FocusedHeader } from './FocusedHeader';
import styles from './Layout.module.css';
import { cx } from '../../lib/cx';

const AUTH_PATHS = ['/login', '/register', '/lupa-password', '/reset-password', '/menunggu-persetujuan'];

function RouteFallback() {
  return (
    <div className={styles.routeFallback} role="status" aria-live="polite">
      <span className={styles.routeFallbackLine} aria-hidden="true" />
      <span>Menyiapkan halaman…</span>
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const isAuthRoute = AUTH_PATHS.includes(location.pathname);
  const isReaderRoute = /^\/quran\/(?:juz\/)?\d+\/?$/.test(location.pathname);
  const isUtilityRoute = /^(?:\/admin(?:\/|$)|\/dashboard\/?$|\/scan\/)/.test(location.pathname);
  const isScanRoute = location.pathname.startsWith('/scan/');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const outlet = (
    <main className={cx(styles.main, isUtilityRoute && styles.utilityMain, isReaderRoute && styles.readerMain)}>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </main>
  );

  if (isAuthRoute) {
    return (
      <>
        <FocusedHeader />
        {outlet}
      </>
    );
  }

  return (
    <>
      <Header />
      {outlet}
      {!isReaderRoute && !isUtilityRoute && <Footer />}
      {!isScanRoute && <BottomNav />}
    </>
  );
}

import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import styles from './Layout.module.css';

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <Header />
      <main style={{ flex: 1 }}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}

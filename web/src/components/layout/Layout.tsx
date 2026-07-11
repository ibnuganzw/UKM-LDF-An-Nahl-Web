import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <Header />
      <main style={{ flex: 1 }}>
        {/* Boundary for the lazy-loaded routes in App.tsx. null matches those
            pages' own loading states (they render null / "Memuat…" while data
            loads), so a chunk fetch just shows nothing briefly. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}

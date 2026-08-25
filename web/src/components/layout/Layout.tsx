import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { FocusedHeader } from './FocusedHeader';
import styles from './Layout.module.css';
import { cx } from '../../lib/cx';
import { initReveal } from '../../lib/reveal';
import { setRouteSeo } from '../../lib/pageTitle';
import { QuranAudioDock } from '../quran/QuranAudioDock';
import { useQuranAudio } from '../../state/QuranAudioContext';
import { useAutoHideChrome } from './useAutoHideChrome';

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
  const { currentVerse } = useQuranAudio();
  const isAuthRoute = AUTH_PATHS.includes(location.pathname);
  const isReaderRoute = /^\/quran\/(?:juz\/)?\d+\/?$/.test(location.pathname);
  const isUtilityRoute = /^(?:\/admin(?:\/|$)|\/dashboard\/?$|\/scan\/)/.test(location.pathname);
  const isScanRoute = location.pathname.startsWith('/scan/');
  const autoHideChrome = !isAuthRoute && !isUtilityRoute && !isScanRoute;
  const chromeVisible = useAutoHideChrome(autoHideChrome, location.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    setRouteSeo(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    initReveal();
  }, []);

  const outlet = (
    <main className={cx(styles.main, isUtilityRoute && styles.utilityMain, isReaderRoute && styles.readerMain, currentVerse && styles.audioActive)}>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </main>
  );

  if (isAuthRoute) {
    return (
      <>
        <FocusedHeader />
        <div className={styles.authShell}>
          <aside className={styles.authAside} aria-hidden="true">
            <blockquote className={styles.authQuote}>
              <p>
                "Dan Tuhanmu mewahyukan kepada lebah: buatlah sarang di gunung-gunung, di
                pohon-pohon kayu, dan di tempat-tempat yang dibuat manusia."
              </p>
              <cite>QS. An-Nahl : 68</cite>
            </blockquote>
          </aside>
          <main className={styles.authMain}>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <QuranAudioDock />
      </>
    );
  }

  return (
    <>
      <Header hidden={!chromeVisible} />
      {outlet}
      {!isReaderRoute && !isUtilityRoute && <Footer />}
      {!isScanRoute && <BottomNav hidden={!chromeVisible} />}
      <QuranAudioDock mobileChromeVisible={chromeVisible} />
    </>
  );
}

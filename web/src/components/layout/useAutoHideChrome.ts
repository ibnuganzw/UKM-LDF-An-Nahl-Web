import { useEffect, useState } from 'react';

const TOP_EDGE = 12;
const HIDE_START = 96;
const HIDE_TRAVEL = 28;
const SHOW_TRAVEL = 24;
const DIRECTION_DEAD_ZONE = 2;
const INTENT_GAP_MS = 180;
const VIEWPORT_SETTLE_MS = 240;

type ScrollDirection = 'up' | 'down' | null;

export interface ChromeScrollState {
  direction: ScrollDirection;
  lastY: number;
  travel: number;
  visible: boolean;
}

export function createChromeScrollState(scrollY = 0): ChromeScrollState {
  return {
    direction: null,
    lastY: Math.max(0, scrollY),
    travel: 0,
    visible: true,
  };
}

export function resetChromeScrollIntent(
  state: ChromeScrollState,
  scrollY = state.lastY,
): ChromeScrollState {
  return {
    ...state,
    direction: null,
    lastY: Math.max(0, scrollY),
    travel: 0,
  };
}

export function advanceChromeScrollState(
  state: ChromeScrollState,
  scrollY: number,
): ChromeScrollState {
  const nextY = Math.max(0, scrollY);

  if (nextY <= TOP_EDGE) {
    return {
      direction: null,
      lastY: nextY,
      travel: 0,
      visible: true,
    };
  }

  const delta = nextY - state.lastY;
  if (Math.abs(delta) < DIRECTION_DEAD_ZONE) return state;

  const direction: ScrollDirection = delta > 0 ? 'down' : 'up';
  const travel = direction === state.direction
    ? state.travel + Math.abs(delta)
    : Math.abs(delta);
  let visible = state.visible;

  if (direction === 'down' && nextY >= HIDE_START && travel >= HIDE_TRAVEL) {
    visible = false;
  } else if (direction === 'up' && travel >= SHOW_TRAVEL) {
    visible = true;
  }

  return {
    direction,
    lastY: nextY,
    travel: visible === state.visible ? travel : 0,
    visible,
  };
}

export function shouldKeepChromeOpen(
  active: Pick<Element, 'matches'> | null,
  hasOpenOverlay: boolean,
): boolean {
  if (active?.matches('input, textarea, select, [contenteditable="true"]')) return true;
  return hasOpenOverlay;
}

function shouldHoldChromeOpen(): boolean {
  return shouldKeepChromeOpen(
    document.activeElement,
    Boolean(document.querySelector(
      'dialog[open], [role="dialog"][aria-modal="true"], [aria-controls="mobile-main-menu"][aria-expanded="true"]',
    )),
  );
}

export function useAutoHideChrome(enabled: boolean, routeKey: string): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (!enabled) return;

    const mobile = window.matchMedia('(max-width: 919px)');
    let frame = 0;
    let lastScrollAt = 0;
    let viewportSettling = false;
    let viewportTimer = 0;
    let state = createChromeScrollState(window.scrollY);

    const holdOpen = () => {
      state = createChromeScrollState(window.scrollY);
      lastScrollAt = 0;
      setVisible(true);
    };

    const resetIntent = () => {
      state = resetChromeScrollIntent(state, window.scrollY);
      lastScrollAt = 0;
    };

    const update = () => {
      frame = 0;
      if (!mobile.matches || viewportSettling || shouldHoldChromeOpen()) {
        holdOpen();
        return;
      }

      const now = window.performance.now();
      if (lastScrollAt && now - lastScrollAt > INTENT_GAP_MS) {
        state = resetChromeScrollIntent(state);
      }
      lastScrollAt = now;
      state = advanceChromeScrollState(state, window.scrollY);
      setVisible((current) => current === state.visible ? current : state.visible);
    };

    const schedule = () => {
      if (!mobile.matches) return;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const handleViewportChange = () => {
      viewportSettling = true;
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      holdOpen();
      if (viewportTimer) window.clearTimeout(viewportTimer);
      viewportTimer = window.setTimeout(() => {
        viewportSettling = false;
        holdOpen();
      }, VIEWPORT_SETTLE_MS);
    };

    const overlayObserver = new MutationObserver(() => {
      if (!mobile.matches || !shouldHoldChromeOpen()) return;
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      holdOpen();
    });
    overlayObserver.observe(document.body, {
      attributeFilter: ['open', 'aria-expanded', 'aria-modal'],
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', handleViewportChange);
    document.addEventListener('focusin', holdOpen);
    document.addEventListener('pointerdown', resetIntent, { passive: true });
    mobile.addEventListener('change', handleViewportChange);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (viewportTimer) window.clearTimeout(viewportTimer);
      overlayObserver.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', handleViewportChange);
      document.removeEventListener('focusin', holdOpen);
      document.removeEventListener('pointerdown', resetIntent);
      mobile.removeEventListener('change', handleViewportChange);
    };
  }, [enabled, routeKey]);

  return visible;
}

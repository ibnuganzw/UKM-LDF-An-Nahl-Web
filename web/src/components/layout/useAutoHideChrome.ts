import { useEffect, useState } from 'react';

const TOP_EDGE = 12;
const HIDE_START = 96;
const HIDE_TRAVEL = 28;
const SHOW_TRAVEL = 7;

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
  if (Math.abs(delta) < 0.5) return { ...state, lastY: nextY };

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

function shouldHoldChromeOpen(): boolean {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement
    && active.matches('input, textarea, select, [contenteditable="true"]')
  ) {
    return true;
  }

  return Boolean(document.querySelector(
    'dialog[open], [role="dialog"][aria-modal="true"], [aria-controls="mobile-main-menu"][aria-expanded="true"]',
  ));
}

export function useAutoHideChrome(enabled: boolean, routeKey: string): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (!enabled) return;

    const mobile = window.matchMedia('(max-width: 919px)');
    let frame = 0;
    let state = createChromeScrollState(window.scrollY);

    const holdOpen = () => {
      state = createChromeScrollState(window.scrollY);
      setVisible(true);
    };

    const update = () => {
      frame = 0;
      if (!mobile.matches || shouldHoldChromeOpen()) {
        holdOpen();
        return;
      }

      state = advanceChromeScrollState(state, window.scrollY);
      setVisible((current) => current === state.visible ? current : state.visible);
    };

    const schedule = () => {
      if (!mobile.matches) return;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const handleViewportChange = () => holdOpen();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', handleViewportChange);
    document.addEventListener('focusin', holdOpen);
    mobile.addEventListener('change', handleViewportChange);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', handleViewportChange);
      document.removeEventListener('focusin', holdOpen);
      mobile.removeEventListener('change', handleViewportChange);
    };
  }, [enabled, routeKey]);

  return visible;
}

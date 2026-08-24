import { describe, expect, it } from 'vitest';
import { advanceChromeScrollState, createChromeScrollState } from './useAutoHideChrome';

describe('mobile chrome scroll intent', () => {
  it('stays visible near the top and hides only after deliberate downward travel', () => {
    let state = createChromeScrollState();
    state = advanceChromeScrollState(state, 40);
    state = advanceChromeScrollState(state, 78);
    expect(state.visible).toBe(true);

    state = advanceChromeScrollState(state, 104);
    expect(state.visible).toBe(false);
  });

  it('returns after a small upward gesture', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 112);
    expect(state.visible).toBe(false);

    state = advanceChromeScrollState(state, 107);
    expect(state.visible).toBe(false);
    state = advanceChromeScrollState(state, 105);
    expect(state.visible).toBe(true);
  });

  it('does not mistake direction jitter for one continuous gesture', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 120);
    state = advanceChromeScrollState(state, 116);
    state = advanceChromeScrollState(state, 119);
    state = advanceChromeScrollState(state, 115);
    expect(state.visible).toBe(false);

    state = advanceChromeScrollState(state, 112);
    expect(state.visible).toBe(true);
  });

  it('always restores the chrome at the top edge', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 120);
    expect(state.visible).toBe(false);
    expect(advanceChromeScrollState(state, 8).visible).toBe(true);
  });
});

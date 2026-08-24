import { describe, expect, it } from 'vitest';
import {
  advanceChromeScrollState,
  createChromeScrollState,
  resetChromeScrollIntent,
} from './useAutoHideChrome';

describe('mobile chrome scroll intent', () => {
  it('stays visible near the top and hides only after deliberate downward travel', () => {
    let state = createChromeScrollState();
    state = advanceChromeScrollState(state, 40);
    state = advanceChromeScrollState(state, 78);
    expect(state.visible).toBe(true);

    state = advanceChromeScrollState(state, 104);
    expect(state.visible).toBe(false);
  });

  it('returns only after deliberate upward travel', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 112);
    expect(state.visible).toBe(false);

    state = advanceChromeScrollState(state, 107);
    expect(state.visible).toBe(false);
    state = advanceChromeScrollState(state, 96);
    expect(state.visible).toBe(false);
    state = advanceChromeScrollState(state, 88);
    expect(state.visible).toBe(true);
  });

  it('does not mistake direction jitter for one continuous gesture', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 120);
    state = advanceChromeScrollState(state, 114);
    state = advanceChromeScrollState(state, 118);
    state = advanceChromeScrollState(state, 110);
    state = advanceChromeScrollState(state, 100);
    expect(state.visible).toBe(false);

    state = advanceChromeScrollState(state, 94);
    expect(state.visible).toBe(true);
  });

  it('ignores sub-two-pixel settling instead of reversing direction', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 120);
    state = advanceChromeScrollState(state, 119);
    state = advanceChromeScrollState(state, 118.5);

    expect(state.visible).toBe(false);
    expect(state.direction).toBe('down');
    expect(state.lastY).toBe(120);
  });

  it('does not carry partial upward travel into a new gesture', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 120);
    state = advanceChromeScrollState(state, 108);
    expect(state.visible).toBe(false);

    state = resetChromeScrollIntent(state, 108);
    state = advanceChromeScrollState(state, 96);
    expect(state.visible).toBe(false);
    state = advanceChromeScrollState(state, 84);
    expect(state.visible).toBe(true);
  });

  it('always restores the chrome at the top edge', () => {
    let state = createChromeScrollState(70);
    state = advanceChromeScrollState(state, 120);
    expect(state.visible).toBe(false);
    expect(advanceChromeScrollState(state, 8).visible).toBe(true);
  });
});

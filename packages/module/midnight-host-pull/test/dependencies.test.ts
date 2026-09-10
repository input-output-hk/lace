import { NEVER } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeMidnightDependencies } from '../src/store/dependencies';

// `document.visibilityState` is read at event time, so the stub is mutable.
type DocumentStub = EventTarget & { visibilityState: DocumentVisibilityState };

const stubDom = (): { window: EventTarget; document: DocumentStub } => {
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
  });
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', document);
  return { window, document };
};

describe('midnight-host-pull windowRefocus$', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('emits once for the focus + visibilitychange pair a single activation fires', async () => {
    const { window, document } = stubDom();
    const emissions: void[] = [];
    initializeMidnightDependencies().windowRefocus$.subscribe(value =>
      emissions.push(value),
    );

    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(300);

    expect(emissions).toEqual([undefined]);
  });

  it('ignores the visibilitychange that HIDES the guest', async () => {
    const { document } = stubDom();
    const emissions: void[] = [];
    initializeMidnightDependencies().windowRefocus$.subscribe(value =>
      emissions.push(value),
    );

    document.visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(300);

    expect(emissions).toEqual([]);
  });

  it('is NEVER outside a DOM context, so store init never throws on RN', () => {
    expect(initializeMidnightDependencies().windowRefocus$).toBe(NEVER);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (task?: () => void) => {
      let isCancelled = false;
      const cancel = vi.fn(() => {
        isCancelled = true;
      });
      void Promise.resolve().then(() => {
        if (!isCancelled) {
          task?.();
        }
      });
      return { cancel };
    },
  },
}));

import { scheduleNativeListScrollToTop } from '../../../src/design-system/util/schedule-native-list-scroll-to-top';

describe('scheduleNativeListScrollToTop', () => {
  let nextFrameId: number;
  const scheduled = new Map<number, (time: number) => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    nextFrameId = 0;
    scheduled.clear();
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: (time: number) => void): number => {
        const id = ++nextFrameId;
        scheduled.set(id, callback);
        return id;
      },
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
      scheduled.delete(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Runs one logical frame: all callbacks currently queued for that frame. */
  const flushNextFrame = (): void => {
    const pending = [...scheduled.entries()];
    scheduled.clear();
    for (const [, callback] of pending) {
      callback(0);
    }
  };

  it('calls scrollToTop after settle delay and one animation frame', async () => {
    const scrollToTop = vi.fn();
    scheduleNativeListScrollToTop(scrollToTop);

    expect(scrollToTop).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(scrollToTop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(49);
    expect(scrollToTop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(scrollToTop).not.toHaveBeenCalled();

    flushNextFrame();
    expect(scrollToTop).toHaveBeenCalledTimes(1);
  });

  it('does not call scrollToTop when cancelled before the settle timeout', async () => {
    const scrollToTop = vi.fn();
    const { cancel } = scheduleNativeListScrollToTop(scrollToTop);
    cancel();

    await Promise.resolve();
    vi.advanceTimersByTime(50);
    flushNextFrame();

    expect(scrollToTop).not.toHaveBeenCalled();
  });

  it('does not call scrollToTop when cancelled after the settle timeout but before rAF', async () => {
    const scrollToTop = vi.fn();
    const { cancel } = scheduleNativeListScrollToTop(scrollToTop);

    await Promise.resolve();
    vi.advanceTimersByTime(50);
    cancel();
    flushNextFrame();

    expect(scrollToTop).not.toHaveBeenCalled();
  });
});

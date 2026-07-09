import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { refreshFeatureFlagsOnAllViewsClosed } from '../../src/store/side-effects';

import type { View } from '@lace-contract/views';

vi.mock('../../src/store/refresh-trigger', () => ({
  featureFlagRefreshTrigger$: { next: vi.fn() },
}));

const triggerSpy = async () => {
  const { featureFlagRefreshTrigger$ } = (await import(
    '../../src/store/refresh-trigger'
  )) as unknown as {
    featureFlagRefreshTrigger$: { next: ReturnType<typeof vi.fn> };
  };
  return featureFlagRefreshTrigger$.next;
};

describe('app-activity-web side effects', () => {
  describe('refreshFeatureFlagsOnAllViewsClosed', () => {
    it('fires the refresh trigger when open views drop from a positive count to zero', async () => {
      const next = await triggerSpy();
      next.mockClear();

      testSideEffect(
        refreshFeatureFlagsOnAllViewsClosed,
        ({ cold, flush }) => ({
          stateObservables: {
            views: {
              selectOpenViews$: cold<View[]>('a-b', {
                a: [{ id: 'a' } as View],
                b: [],
              }),
            },
          },
          dependencies: {},
          assertion: sideEffect$ => {
            sideEffect$.subscribe();
            flush();
          },
        }),
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('does not fire when transitioning from zero to zero', async () => {
      const next = await triggerSpy();
      next.mockClear();

      testSideEffect(
        refreshFeatureFlagsOnAllViewsClosed,
        ({ cold, flush }) => ({
          stateObservables: {
            views: {
              selectOpenViews$: cold<View[]>('a-a', { a: [] }),
            },
          },
          dependencies: {},
          assertion: sideEffect$ => {
            sideEffect$.subscribe();
            flush();
          },
        }),
      );

      expect(next).not.toHaveBeenCalled();
    });

    it('does not fire when open views grow', async () => {
      const next = await triggerSpy();
      next.mockClear();

      testSideEffect(
        refreshFeatureFlagsOnAllViewsClosed,
        ({ cold, flush }) => ({
          stateObservables: {
            views: {
              selectOpenViews$: cold<View[]>('a-b', {
                a: [],
                b: [{ id: 'a' } as View],
              }),
            },
          },
          dependencies: {},
          assertion: sideEffect$ => {
            sideEffect$.subscribe();
            flush();
          },
        }),
      );

      expect(next).not.toHaveBeenCalled();
    });
  });
});

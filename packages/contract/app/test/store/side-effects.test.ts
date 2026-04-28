import { analyticsActions } from '@lace-contract/analytics';
import { featuresActions } from '@lace-contract/feature';
import { type Features } from '@lace-contract/feature';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { appActions } from '../../src';
import {
  reloadAppInTheBackground,
  trackSession,
} from '../../src/store/side-effects';

import type { View } from '@lace-contract/views';
import type { Mock } from 'vitest';

// Define type for dependencies
interface ReloadAppDependencies {
  reloadApplication: Mock;
  actions: typeof actions;
}

interface TrackSessionDependencies {
  actions: typeof actions;
}

vi.mock('uuid', () => {
  return {
    v4: vi.fn(() => '452a30b2-1024-41fa-aefc-38c2d7c4776b'),
  };
});

const actions = {
  ...featuresActions,
  ...viewsActions,
  ...analyticsActions,
  ...appActions,
};

const onboardingView: View = {
  id: ViewId('onboarding_view_id'),
  type: 'sidePanel',
  location: 'onboarding',
};

describe('Side Effects', () => {
  describe('reloadAppInTheBackground', () => {
    it('should reload the application when updateFeatures action is dispatched and no views are open', () => {
      const mockReloadApplication = vi.fn();
      testSideEffect(reloadAppInTheBackground, ({ hot, expectObservable }) => {
        return {
          actionObservables: {
            features: {
              updateFeatures$: hot('-a', {
                a: actions.features.updateFeatures({} as Features),
              }),
            },
          },
          stateObservables: {
            views: { selectOpenViews$: hot('-a', { a: [] }) },
          },
          dependencies: {
            reloadApplication: mockReloadApplication,
            actions,
          } as ReloadAppDependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: {
                type: 'app/reloadApplication',
              },
            });
          },
        };
      });
    });

    it('should not reload the application if there are open views after an updateFeatures action', () => {
      const mockReloadApplication = vi.fn();
      testSideEffect(
        reloadAppInTheBackground,
        ({ flush, hot, expectObservable }) => {
          return {
            actionObservables: {
              features: {
                updateFeatures$: hot('-a', {
                  a: actions.features.updateFeatures({} as Features),
                }),
              },
            },
            stateObservables: {
              views: { selectOpenViews$: hot('-a', { a: [onboardingView] }) },
            },
            dependencies: {
              reloadApplication: mockReloadApplication,
            } as ReloadAppDependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-');

              flush();

              expect(mockReloadApplication).not.toHaveBeenCalled();
            },
          };
        },
      );
    });
  });

  describe('trackSession', () => {
    it('should track session based on view connections', () => {
      testSideEffect(trackSession, ({ hot, expectObservable }) => {
        return {
          actionObservables: {
            views: {
              viewConnected$: hot('-a', {
                a: actions.views.viewConnected(onboardingView),
              }),
            },
          },
          stateObservables: {
            views: {
              selectOpenViews$: hot('-a-b', {
                a: [onboardingView],
                b: [],
              }),
            },
          },
          dependencies: { actions } as TrackSessionDependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a 500ms -b', {
              a: actions.analytics.trackEvent({
                eventName: 'wallet | session start | Pageview',
                payload: { sessionId: '452a30b2-1024-41fa-aefc-38c2d7c4776b' },
              }),
              b: actions.analytics.trackEvent({
                eventName: 'wallet | session | end',
                payload: { sessionId: '452a30b2-1024-41fa-aefc-38c2d7c4776b' },
              }),
            });
          },
        };
      });
    });
  });
});

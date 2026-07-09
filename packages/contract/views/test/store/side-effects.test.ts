import '../../src/augmentations';

import { analyticsActions } from '@lace-contract/analytics';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { trackThemePreferenceChange } from '../../src/store/side-effects';
import { viewsActions } from '../../src/store/slice';

const actions = { ...viewsActions, ...analyticsActions };

describe('trackThemePreferenceChange', () => {
  it.each([
    ['light', 'settings | theme | light mode | press'],
    ['dark', 'settings | theme | dark mode | press'],
    ['system', 'settings | theme | system mode | press'],
  ] as const)(
    'emits the correct event for theme preference "%s"',
    (theme, eventName) => {
      testSideEffect(
        trackThemePreferenceChange,
        ({ hot, expectObservable }) => ({
          actionObservables: {
            views: {
              setThemePreference$: hot('-a', {
                a: actions.views.setThemePreference(theme),
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.analytics.trackEvent({ eventName }),
            });
          },
        }),
      );
    },
  );
});

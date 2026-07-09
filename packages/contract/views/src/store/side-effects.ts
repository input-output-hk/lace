import { map } from 'rxjs';

import type { SideEffect } from '../contract';

export const trackThemePreferenceChange: SideEffect = (
  { views: { setThemePreference$ } },
  _,
  { actions },
) =>
  setThemePreference$.pipe(
    map(({ payload: theme }) =>
      actions.analytics.trackEvent({
        eventName:
          theme === 'light'
            ? 'settings | theme | light mode | press'
            : theme === 'dark'
            ? 'settings | theme | dark mode | press'
            : 'settings | theme | system mode | press',
      }),
    ),
  );

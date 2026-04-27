import { map, mergeMap } from 'rxjs';

import type { ActionCreators, Selectors } from '../contract';
import type { AnalyticsEventName } from '@lace-contract/analytics';
import type { LaceSideEffect } from '@lace-contract/module';

type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

export const trackColorSchemeChange: SideEffect = (
  { views: { handleColorSchemeChange$ } },
  { views: { selectColorScheme$ } },
  { actions },
) =>
  handleColorSchemeChange$.pipe(
    mergeMap(() =>
      selectColorScheme$.pipe(
        map(colorScheme => {
          const colorSchemeChangeEventName: AnalyticsEventName =
            colorScheme === 'light'
              ? 'settings | theme | light mode | press'
              : 'settings | theme | dark mode | press';

          return actions.analytics.trackEvent({
            eventName: colorSchemeChangeEventName,
          });
        }),
      ),
    ),
  );

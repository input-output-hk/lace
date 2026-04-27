import { useCallback, useContext } from 'react';
import { ReactReduxContext } from 'react-redux';

import { analyticsActions } from './store/slice';

import type { AnalyticsEventName } from './analytics-event-name';
import type { JsonType } from '@lace-lib/util-store';

export const useAnalytics = () => {
  const contextValue = useContext(ReactReduxContext);
  return {
    trackEvent: useCallback(
      (event: AnalyticsEventName, payload?: Record<string, JsonType>) =>
        contextValue!.store.dispatch(
          analyticsActions.analytics.trackEvent({ eventName: event, payload }),
        ),
      [contextValue],
    ),
  };
};

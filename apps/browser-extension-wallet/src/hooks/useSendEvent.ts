import { useCallback } from 'react';
import { useAnalyticsContext } from '@providers';
import { AnalyticsEventActions, AnalyticsEventCategories } from '@providers/AnalyticsProvider/analyticsTracker';

type SendEventFn = (name: string, value?: number) => void;

export const useSendEvent = (): SendEventFn => {
  const analytics = useAnalyticsContext();

  return useCallback(
    (name: string, value?: number) =>
      analytics.sendEvent({
        action: AnalyticsEventActions.CLICK_EVENT,
        category: AnalyticsEventCategories.SEND_TRANSACTION,
        name,
        value
      }),
    [analytics]
  );
};

import { useCallback } from 'react';
import { useAnalyticsContext } from '@providers';
import { AnalyticsEventActions, AnalyticsEventCategories } from '@providers/AnalyticsProvider/analyticsTracker';

type SendEventFn = (name: string, value?: number) => void;

export const useSendEvent = (action: AnalyticsEventActions, category: AnalyticsEventCategories): SendEventFn => {
  const analytics = useAnalyticsContext();

  return useCallback(
    (name: string, value?: number) =>
      analytics.sendEvent({
        action,
        category,
        name,
        value
      }),
    [analytics, action, category]
  );
};

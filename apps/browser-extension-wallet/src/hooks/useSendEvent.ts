import { useCallback } from 'react';
import { useAnalyticsContext } from '@providers';
import { MatomoEventActions, MatomoEventCategories } from '@providers/AnalyticsProvider/analyticsTracker';

type SendEventFn = (name: string, value?: number) => void;

export const useSendEvent = (action: MatomoEventActions, category: MatomoEventCategories): SendEventFn => {
  const analytics = useAnalyticsContext();

  return useCallback(
    (name: string, value?: number) =>
      analytics.sendEventToMatomo({
        action,
        category,
        name,
        value
      }),
    [analytics, action, category]
  );
};

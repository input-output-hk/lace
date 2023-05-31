import { AnalyticsClient } from './types';

export const NoopAnalyticsClient: AnalyticsClient = {
  sendPageNavigationEvent: () => Promise.resolve(),
  sendEvent: () => Promise.resolve()
};

import { AnalyticsClient } from './analyticsTracker/types';

export const NoopAnalyticsClient: AnalyticsClient = {
  sendPageNavigationEvent: () => Promise.resolve(),
  sendEvent: () => Promise.resolve(),
  setOptedInForEnhancedAnalytics: () => void 0,
  setSiteId: () => void 0
};

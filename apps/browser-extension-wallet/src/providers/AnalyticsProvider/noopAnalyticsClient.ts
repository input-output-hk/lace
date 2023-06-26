import { AnalyticsClient } from './analyticsTracker/types';

export const NoopAnalyticsClient: AnalyticsClient = {
  sendPageNavigationEvent: () => Promise.resolve(),
  sendEvent: () => Promise.resolve(),
  setOptedInForEnhancedTracking: () => void 0,
  setSiteId: () => void 0
};

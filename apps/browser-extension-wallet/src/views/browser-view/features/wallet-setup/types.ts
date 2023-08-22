import { PostHogAction, PostHogProperties } from '@providers/AnalyticsProvider/analyticsTracker';

export type SendOnboardingAnalyticsEvent = (
  eventName: string,
  postHogAction?: PostHogAction,
  value?: number,
  postHogProperties?: PostHogProperties
) => Promise<void>;

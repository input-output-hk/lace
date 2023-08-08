import { PostHogAction, PostHogProperties } from '@providers/AnalyticsProvider/analyticsTracker';

export type SendOboardingAnalyticsEvent = (
  eventName: string,
  postHogAction?: PostHogAction,
  value?: number,
  postHogProperties?: PostHogProperties
) => void;

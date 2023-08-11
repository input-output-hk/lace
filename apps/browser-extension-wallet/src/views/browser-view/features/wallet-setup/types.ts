import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export type SendOboardingAnalyticsEvent = (eventName: string, postHogAction?: PostHogAction, value?: number) => void;

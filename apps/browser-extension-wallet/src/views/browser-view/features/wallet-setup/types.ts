import { PostHogAction, PostHogProperties } from '@providers/AnalyticsProvider/analyticsTracker';

export type SendOnboardingAnalyticsEvent = (
  eventName: string,
  postHogAction?: PostHogAction,
  value?: number,
  postHogProperties?: PostHogProperties
) => Promise<void>;

export enum SetupType {
  CREATE = 'create',
  RESTORE = 'restore',
  FORGOT_PASSWORD = 'forgot_password'
}

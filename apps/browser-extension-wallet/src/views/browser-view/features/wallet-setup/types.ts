import { PostHogAction, PostHogProperties } from '@providers/AnalyticsProvider/analyticsTracker';

export type SendOnboardingAnalyticsEvent = (
  postHogAction: PostHogAction,
  postHogProperties?: PostHogProperties
) => Promise<void>;

export enum SetupType {
  CREATE = 'create',
  RESTORE = 'restore',
  FORGOT_PASSWORD = 'forgot_password'
}

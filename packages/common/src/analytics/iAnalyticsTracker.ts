import type { PostHogAction, MatomoSendEventProps, PostHogProperties } from './types';

export interface IAnalyticsTracker {
  sendPageNavigationEvent: () => Promise<void>;
  sendAliasEvent: () => Promise<void>;
  sendEventToMatomo: (props: MatomoSendEventProps) => Promise<void>;
  sendEventToPostHog: (action: PostHogAction, properties?: PostHogProperties) => Promise<void>;
}

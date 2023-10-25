import type { PostHogAction, PostHogProperties } from './types';

export interface IAnalyticsTracker {
  sendPageNavigationEvent: () => Promise<void>;
  sendAliasEvent: () => Promise<void>;
  sendEventToPostHog: (action: PostHogAction, properties?: PostHogProperties) => Promise<void>;
}

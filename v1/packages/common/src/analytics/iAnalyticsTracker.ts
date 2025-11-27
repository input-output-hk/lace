import type { PostHogAction, PostHogProperties } from './types';

export interface IAnalyticsTracker<Action extends string = PostHogAction> {
  sendPageNavigationEvent: () => Promise<void>;
  sendAliasEvent: () => Promise<void>;
  sendEventToPostHog: (action: Action, properties?: PostHogProperties) => Promise<void>;
}

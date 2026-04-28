import type { AnalyticsEventName } from './analytics-event-name';
import type { AnalyticsUser } from './store';
import type { JsonType } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

export interface AnalyticsEvent {
  eventName: AnalyticsEventName;
  payload?: Record<string, JsonType>;
}

export type AnalyticsEventContext = {
  user: AnalyticsUser;
};

export type AnalyticsProvider = {
  trackAnalyticsEvent: (
    analyticsEvent: AnalyticsEvent,
    context: AnalyticsEventContext,
  ) => Observable<void>;
};

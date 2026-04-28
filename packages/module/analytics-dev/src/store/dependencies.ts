import { of } from 'rxjs';

import type { AnalyticsProvider } from '@lace-contract/analytics';

export const sideEffectDependencies: AnalyticsProvider = {
  trackAnalyticsEvent: () => of(),
};

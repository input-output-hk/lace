import { AnalyticsClient, EnhancedAnalyticsOptInStatus, SendEventProps } from './types';
import { Wallet } from '@lace/cardano';
import { NoopAnalyticsClient } from '../noopAnalyticsClient';
import { MatomoClient } from '../matomo';
import { POSTHOG_ENABLED, PostHogClient } from '../postHog';

export class AnalyticsTracker {
  protected matomoClient: AnalyticsClient;
  protected postHogClient: AnalyticsClient;

  constructor(
    chain: Wallet.Cardano.ChainId,
    analyticsDisabled: boolean,
    enhancedAnalyticsOptInStatus?: EnhancedAnalyticsOptInStatus
  ) {
    this.matomoClient = NoopAnalyticsClient;
    this.postHogClient = NoopAnalyticsClient;

    if (!analyticsDisabled) {
      this.matomoClient = new MatomoClient(chain, enhancedAnalyticsOptInStatus);
    }
    if (!analyticsDisabled && POSTHOG_ENABLED) {
      this.postHogClient = new PostHogClient(chain, enhancedAnalyticsOptInStatus);
    }
  }

  setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): void {
    this.matomoClient.setOptedInForEnhancedAnalytics(status);
    this.postHogClient.setOptedInForEnhancedAnalytics(status);
  }

  sendPageNavigationEvent(path: string): void {
    this.matomoClient.sendPageNavigationEvent(path);
    this.postHogClient.sendPageNavigationEvent(path);
  }

  // TODO: rename to sendEventToMatomo in separate PR
  sendEvent(props: SendEventProps): void {
    this.matomoClient.sendEvent(props);
  }

  // TODO: implement PostHog-specific type
  sendEventToPostHog(props: SendEventProps): void {
    this.postHogClient.sendEvent(props);
  }

  setSiteId(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient.setSiteId(chain);
    this.postHogClient.setSiteId(chain);
  }
}

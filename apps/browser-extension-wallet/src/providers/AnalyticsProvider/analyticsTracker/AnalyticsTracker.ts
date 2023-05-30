import { AnalyticsConsentStatus, AnalyticsClient, sendEventProps } from './types';
import { Wallet } from '@lace/cardano';
import { NoopAnalyticsClient } from './noopAnalyticsClient';
import { MatomoClient } from './MatomoClient';

export class AnalyticsTracker {
  protected analyticsClient: AnalyticsClient;

  constructor(protected chain: Wallet.Cardano.ChainId, enabled: boolean, analyticsAccepted?: AnalyticsConsentStatus) {
    this.analyticsClient = NoopAnalyticsClient;

    if (!enabled) {
      this.disableTracking();
    } else {
      this.analyticsClient = new MatomoClient(this.chain, analyticsAccepted);
    }
  }

  disableTracking(): void {
    this.analyticsClient = NoopAnalyticsClient;
  }

  toogleCookies(isEnabled: boolean): void {
    this.analyticsClient.toogleCookies(isEnabled);
  }

  sendPageNavigationEvent(path: string): void {
    this.analyticsClient.sendPageNavigationEvent(path);
  }

  sendEvent(props: sendEventProps): void {
    this.analyticsClient.sendEvent(props);
  }
}

import { EnhancedAnalyticsOptInStatus, PostHogAction, SendEventProps } from './types';
import { Wallet } from '@lace/cardano';
import { MatomoClient } from '../matomo';
import { POSTHOG_ENABLED, PostHogClient } from '../postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';

export class AnalyticsTracker {
  protected matomoClient?: MatomoClient;
  protected postHogClient?: PostHogClient;
  protected userIdService?: UserIdService;

  constructor(chain: Wallet.Cardano.ChainId, analyticsDisabled: boolean) {
    if (analyticsDisabled) return;
    this.userIdService = getUserIdService();
    this.matomoClient = new MatomoClient(chain, this.userIdService);

    if (POSTHOG_ENABLED) {
      this.postHogClient = new PostHogClient(chain, this.userIdService);
    }
  }

  async setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): Promise<void> {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (status === EnhancedAnalyticsOptInStatus.OptedIn) {
      await this.userIdService?.makePersistent();
    } else {
      await this.userIdService?.makeTemporary();
    }
  }

  async sendPageNavigationEvent(): Promise<void> {
    await this.postHogClient?.sendPageNavigationEvent();
  }

  // TODO: rename to sendEventToMatomo  (https://input-output.atlassian.net/browse/LW-7197)
  async sendEvent(props: SendEventProps): Promise<void> {
    await this.matomoClient?.sendEvent(props);
    await this.userIdService?.extendLifespan();
  }

  async sendEventToPostHog(action: PostHogAction, properties: Record<string, string | boolean> = {}): Promise<void> {
    await this.postHogClient?.sendEvent(action, properties);
    await this.userIdService?.extendLifespan();
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient?.setChain(chain);
    this.postHogClient?.setChain(chain);
  }
}

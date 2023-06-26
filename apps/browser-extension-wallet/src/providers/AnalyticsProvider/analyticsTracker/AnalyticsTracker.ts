import { EnhancedAnalyticsOptInStatus, SendEventProps, PostHogAction } from './types';
import { Wallet } from '@lace/cardano';
import { MatomoClient } from '../matomo';
import { POSTHOG_ENABLED, PostHogClient } from '../postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';

export class AnalyticsTracker {
  protected matomoClient?: MatomoClient;
  protected postHogClient?: PostHogClient;
  protected userIdService: UserIdService;

  constructor(
    chain: Wallet.Cardano.ChainId,
    analyticsDisabled: boolean,
    enhancedAnalyticsOptInStatus?: EnhancedAnalyticsOptInStatus
  ) {
    this.userIdService = getUserIdService();

    if (!analyticsDisabled) {
      this.matomoClient = new MatomoClient(chain, this.userIdService);
    }
    if (!analyticsDisabled && POSTHOG_ENABLED) {
      this.postHogClient = new PostHogClient(chain, this.userIdService, enhancedAnalyticsOptInStatus);
    }
  }

  async setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): Promise<void> {
    this.postHogClient?.setOptedInForEnhancedAnalytics(status);

    // eslint-disable-next-line unicorn/prefer-ternary
    if (status === EnhancedAnalyticsOptInStatus.OptedIn) {
      await this.userIdService.makePersistent();
    } else {
      await this.userIdService.makeTemporary();
    }
  }

  async sendPageNavigationEvent(path: string): Promise<void> {
    await Promise.all([
      this.matomoClient.sendPageNavigationEvent(path),
      this.postHogClient.sendPageNavigationEvent(path)
    ]);
  }

  // TODO: rename to sendEventToMatomo  (https://input-output.atlassian.net/browse/LW-7197)
  async sendEvent(props: SendEventProps): Promise<void> {
    await this.matomoClient.sendEvent(props);
    await this.userIdService.extendLifespan();
  }

  async sendEventToPostHog(action: PostHogAction, properties: Record<string, string | boolean> = {}): Promise<void> {
    await this.postHogClient.sendEvent(action, properties);
    await this.userIdService.extendLifespan();
  }

  setSiteId(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient.setChain(chain);
    this.postHogClient.setChain(chain);
  }
}

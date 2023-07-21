import { EnhancedAnalyticsOptInStatus, ExtensionViews, MatomoSendEventProps, PostHogAction } from './types';
import { Wallet } from '@lace/cardano';
import { MatomoClient } from '../matomo';
import { POSTHOG_ENABLED, PostHogClient } from '../postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';

export class AnalyticsTracker {
  protected matomoClient?: MatomoClient;
  protected postHogClient?: PostHogClient;
  protected userIdService?: UserIdService;

  constructor(
    extensionParams: {
      chain: Wallet.Cardano.ChainId;
      view?: ExtensionViews;
    },
    analyticsDisabled = false,
    isPostHogEnabled = POSTHOG_ENABLED
  ) {
    if (analyticsDisabled) return;
    this.userIdService = getUserIdService();
    this.matomoClient = new MatomoClient(extensionParams.chain, this.userIdService);

    if (isPostHogEnabled) {
      this.postHogClient = new PostHogClient(extensionParams.chain, this.userIdService, extensionParams?.view);
    }
  }

  async setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): Promise<void> {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (status === EnhancedAnalyticsOptInStatus.OptedIn) {
      await this.userIdService?.makePersistent();
      // At this point, the wallet has been created, so, we are able to link the temporary ID with the hash ID
      await this.#sendAliasEvent();
    } else {
      await this.userIdService?.makeTemporary();
    }
  }

  async sendPageNavigationEvent(): Promise<void> {
    await this.postHogClient?.sendPageNavigationEvent();
  }

  async #sendAliasEvent(): Promise<void> {
    await this.postHogClient?.sendAliasEvent();
  }

  async sendEventToMatomo(props: MatomoSendEventProps): Promise<void> {
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

import {
  EnhancedAnalyticsOptInStatus,
  ExperimentName,
  ExtensionViews,
  MatomoSendEventProps,
  PostHogAction,
  PostHogProperties
} from './types';
import { Wallet } from '@lace/cardano';
import { MatomoClient } from '../matomo';
import { POSTHOG_ENABLED, PostHogClient } from '../postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';
import { Subscription } from 'rxjs';

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
      await this.sendAliasEvent();
    } else {
      await this.userIdService?.makeTemporary();
    }
  }

  async sendPageNavigationEvent(): Promise<void> {
    await this.postHogClient?.sendPageNavigationEvent();
  }

  async sendAliasEvent(): Promise<void> {
    await this.postHogClient?.sendAliasEvent();
  }

  async sendEventToMatomo(props: MatomoSendEventProps): Promise<void> {
    await this.matomoClient?.sendEvent(props);
    await this.userIdService?.extendLifespan();
  }

  async sendEventToPostHog(action: PostHogAction, properties: PostHogProperties = {}): Promise<void> {
    await this.postHogClient?.sendEvent(action, properties);
    await this.userIdService?.extendLifespan();
  }

  getPostHogFeatureFlag(callback: (flags: Array<string>) => void): Subscription {
    return this.postHogClient?.subscribeToRemoteFlags(callback);
  }

  getFeatureFlagVariant(key: ExperimentName): string {
    return this.postHogClient.getFeatureFlagVariant(key);
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient?.setChain(chain);
    this.postHogClient?.setChain(chain);
  }
}

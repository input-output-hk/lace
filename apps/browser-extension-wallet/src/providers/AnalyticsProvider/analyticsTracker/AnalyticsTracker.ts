import {
  EnhancedAnalyticsOptInStatus,
  ExtensionViews,
  MatomoSendEventProps,
  PostHogAction,
  PostHogProperties
} from './types';
import { Wallet } from '@lace/cardano';
import { MatomoClient, MATOMO_OPTED_OUT_EVENTS_DISABLED } from '../matomo';
import { POSTHOG_ENABLED, POSTHOG_OPTED_OUT_EVENTS_DISABLED, PostHogClient } from '../postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';

interface AnalyticsTrackerArgs {
  extensionParams: {
    chain: Wallet.Cardano.ChainId;
    view?: ExtensionViews;
  };
  analyticsDisabled?: boolean;
  isPostHogEnabled?: boolean;
  isOptedInUser?: boolean;
}
export class AnalyticsTracker {
  protected matomoClient?: MatomoClient;
  protected postHogClient?: PostHogClient;
  protected userIdService?: UserIdService;
  protected isOptedInUser?: boolean;

  constructor({
    extensionParams,
    analyticsDisabled = false,
    isPostHogEnabled = POSTHOG_ENABLED,
    isOptedInUser = false
  }: AnalyticsTrackerArgs) {
    if (analyticsDisabled) return;
    this.isOptedInUser = isOptedInUser;
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
    if (POSTHOG_OPTED_OUT_EVENTS_DISABLED && !this.isOptedInUser) return;
    await this.postHogClient?.sendPageNavigationEvent();
  }

  async sendAliasEvent(): Promise<void> {
    if (POSTHOG_OPTED_OUT_EVENTS_DISABLED && !this.isOptedInUser) return;
    await this.postHogClient?.sendAliasEvent();
  }

  async sendEventToMatomo(props: MatomoSendEventProps): Promise<void> {
    if (MATOMO_OPTED_OUT_EVENTS_DISABLED && !this.isOptedInUser) return;
    await this.matomoClient?.sendEvent(props);
    await this.userIdService?.extendLifespan();
  }

  async sendEventToPostHog(action: PostHogAction, properties: PostHogProperties = {}): Promise<void> {
    if (POSTHOG_OPTED_OUT_EVENTS_DISABLED && !this.isOptedInUser) return;
    await this.postHogClient?.sendEvent(action, properties);
    await this.userIdService?.extendLifespan();
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient?.setChain(chain);
    this.postHogClient?.setChain(chain);
  }

  setIsOptedInUser(isOptedInUser: boolean): void {
    this.isOptedInUser = isOptedInUser;
  }
}

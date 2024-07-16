import {
  EnhancedAnalyticsOptInStatus,
  ExtensionViews,
  UserTrackingType,
  PostHogAction,
  PostHogProperties,
  IAnalyticsTracker
} from './types';
import { Wallet } from '@lace/cardano';
import {
  POSTHOG_OPTED_OUT_EVENTS_DISABLED,
  PostHogClient,
  POSTHOG_EXCLUDED_EVENTS
} from '../../PostHogClientProvider/client';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';
import { PostHogMultiWalletAction, PostHogOnboardingAction } from './events';

type Action = PostHogAction | PostHogMultiWalletAction | PostHogOnboardingAction;

interface AnalyticsTrackerArgs {
  postHogClient?: PostHogClient<Action>;
  view?: ExtensionViews;
  analyticsDisabled?: boolean;
  isPostHogEnabled?: boolean;
  excludedEvents?: string;
}
export class AnalyticsTracker implements IAnalyticsTracker<Action> {
  protected postHogClient?: PostHogClient;
  protected userIdService?: UserIdService;
  protected excludedEvents: string;
  protected userTrackingType?: UserTrackingType;

  constructor({
    postHogClient,
    analyticsDisabled = false,
    excludedEvents = POSTHOG_EXCLUDED_EVENTS ?? ''
  }: AnalyticsTrackerArgs) {
    if (analyticsDisabled) return;
    this.userIdService = getUserIdService();
    this.excludedEvents = excludedEvents;

    if (postHogClient) {
      this.postHogClient = postHogClient;
    }

    this.userIdService.userId$.subscribe(({ type }) => {
      this.userTrackingType = type;
    });
  }

  async setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): Promise<void> {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (status === EnhancedAnalyticsOptInStatus.OptedIn) {
      await this.userIdService?.makePersistent();
    } else {
      await this.userIdService?.makeTemporary();
    }
  }

  private async checkNewSessionStarted(): Promise<void> {
    if (!this.postHogClient) {
      console.debug('[ANALYTICS] no posthog client');
      return;
    }
    if (await this.userIdService.isNewSession()) {
      await this.postHogClient.sendSessionStartEvent();
    }
  }

  async sendPageNavigationEvent(): Promise<void> {
    const shouldOmitEvent = this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent) return;
    await this.userIdService?.extendLifespan();
    await this.checkNewSessionStarted();
    await this.postHogClient?.sendPageNavigationEvent();
  }

  async sendAliasEvent(): Promise<void> {
    const shouldOmitEvent = this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent) return;
    await this.userIdService?.extendLifespan();
    await this.checkNewSessionStarted();
    await this.postHogClient?.sendAliasEvent();
  }

  async sendMergeEvent(extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex): Promise<void> {
    const shouldOmitEvent = this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent) return;
    await this.userIdService?.extendLifespan();
    await this.checkNewSessionStarted();
    await this.postHogClient?.sendMergeEvent(extendedAccountPublicKey);
  }

  async sendEventToPostHog(action: Action, properties: PostHogProperties = {}): Promise<void> {
    const isEventExcluded = this.isEventExcluded(action);
    const shouldOmitEvent = this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent || isEventExcluded) return;
    await this.userIdService?.extendLifespan();
    await this.checkNewSessionStarted();
    await this.postHogClient?.sendEvent(action, properties);
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    this.postHogClient?.setChain(chain);
  }

  private shouldOmitSendEventToPostHog() {
    const isOptedOutUser = this.userTrackingType === UserTrackingType.Basic;
    return POSTHOG_OPTED_OUT_EVENTS_DISABLED && isOptedOutUser;
  }

  private isEventExcluded(action: Action) {
    return this.excludedEvents && this.excludedEvents.split(',').some((exclude: string) => action.startsWith(exclude));
  }
}

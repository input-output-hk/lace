import {
  EnhancedAnalyticsOptInStatus,
  ExtensionViews,
  MatomoSendEventProps,
  PostHogAction,
  PostHogProperties,
  UserTrackingType
} from './types';
import { Wallet } from '@lace/cardano';
import { MatomoClient, MATOMO_OPTED_OUT_EVENTS_DISABLED } from '../matomo';
import {
  POSTHOG_OPTED_OUT_EVENTS_DISABLED,
  PostHogClient,
  POSTHOG_EXCLUDED_EVENTS
} from '../../PostHogClientProvider/client';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';

interface AnalyticsTrackerArgs {
  chain: Wallet.Cardano.ChainId;
  postHogClient?: PostHogClient;
  view?: ExtensionViews;
  analyticsDisabled?: boolean;
  isPostHogEnabled?: boolean;
  excludedEvents?: string;
}
export class AnalyticsTracker {
  protected matomoClient?: MatomoClient;
  protected postHogClient?: PostHogClient;
  protected userIdService?: UserIdService;
  protected excludedEvents: string;
  protected userTrackingType?: UserTrackingType;

  constructor({
    postHogClient,
    chain,
    analyticsDisabled = false,
    excludedEvents = POSTHOG_EXCLUDED_EVENTS ?? ''
  }: AnalyticsTrackerArgs) {
    if (analyticsDisabled) return;
    this.userIdService = getUserIdService();
    this.matomoClient = new MatomoClient(chain, this.userIdService);
    this.excludedEvents = excludedEvents;

    if (postHogClient) {
      this.postHogClient = postHogClient;
    }

    this.userIdService.userTrackingType$.subscribe((trackingType) => {
      this.userTrackingType = trackingType;
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
      await this.postHogClient?.sendSessionStartEvent();
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

  async sendEventToMatomo(props: MatomoSendEventProps): Promise<void> {
    const isOptedOutUser = this.userTrackingType === UserTrackingType.Basic;
    if (MATOMO_OPTED_OUT_EVENTS_DISABLED && isOptedOutUser) return;
    await this.userIdService?.extendLifespan();
    await this.matomoClient?.sendEvent(props);
  }

  async sendEventToPostHog(action: PostHogAction, properties: PostHogProperties = {}): Promise<void> {
    const isEventExcluded = this.isEventExcluded(action);
    const shouldOmitEvent = this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent || isEventExcluded) return;
    await this.userIdService?.extendLifespan();
    await this.checkNewSessionStarted();
    await this.postHogClient?.sendEvent(action, properties);
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient?.setChain(chain);
    this.postHogClient?.setChain(chain);
  }

  private shouldOmitSendEventToPostHog() {
    const isOptedOutUser = this.userTrackingType === UserTrackingType.Basic;
    return POSTHOG_OPTED_OUT_EVENTS_DISABLED && isOptedOutUser;
  }

  private isEventExcluded(action: PostHogAction) {
    return this.excludedEvents && this.excludedEvents.split(',').some((exclude: string) => action.startsWith(exclude));
  }
}

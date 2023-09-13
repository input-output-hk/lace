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
  protected trackingTypeChangedFromSettings: boolean;

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
  }

  async setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): Promise<void> {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (status === EnhancedAnalyticsOptInStatus.OptedIn) {
      await this.userIdService?.makePersistent();
      if (this.trackingTypeChangedFromSettings) {
        this.sendAliasEvent();
        this.trackingTypeChangedFromSettings = false;
      }
    } else {
      await this.userIdService?.makeTemporary();
    }
  }

  async sendPageNavigationEvent(): Promise<void> {
    const shouldOmitEvent = await this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent) return;
    await this.postHogClient?.sendPageNavigationEvent();
  }

  async sendAliasEvent(): Promise<void> {
    const shouldOmitEvent = await this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent) return;
    await this.postHogClient?.sendAliasEvent();
  }

  async sendEventToMatomo(props: MatomoSendEventProps): Promise<void> {
    const isOptedOutUser = (await this.userIdService.getUserTrackingType()) === UserTrackingType.Basic;
    if (MATOMO_OPTED_OUT_EVENTS_DISABLED && isOptedOutUser) return;
    await this.matomoClient?.sendEvent(props);
    await this.userIdService?.extendLifespan();
  }

  async sendEventToPostHog(action: PostHogAction, properties: PostHogProperties = {}): Promise<void> {
    const isEventExcluded = this.isEventExcluded(action);
    const shouldOmitEvent = await this.shouldOmitSendEventToPostHog();
    if (shouldOmitEvent || isEventExcluded) return;
    await this.postHogClient?.sendEvent(action, properties);
    await this.userIdService?.extendLifespan();
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient?.setChain(chain);
    this.postHogClient?.setChain(chain);
  }

  setTrackingTypeChangedFromSettings(): void {
    this.trackingTypeChangedFromSettings = true;
  }

  private async shouldOmitSendEventToPostHog() {
    const userTrackingType = await this.userIdService.getUserTrackingType();
    const isOptedOutUser = userTrackingType === UserTrackingType.Basic;
    return POSTHOG_OPTED_OUT_EVENTS_DISABLED && isOptedOutUser;
  }

  private isEventExcluded(action: PostHogAction) {
    return this.excludedEvents && this.excludedEvents.split(',').some((exclude: string) => action.startsWith(exclude));
  }
}

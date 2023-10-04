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
import { POSTHOG_ENABLED, POSTHOG_OPTED_OUT_EVENTS_DISABLED, PostHogClient, POSTHOG_EXCLUDED_EVENTS } from '../postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';

interface AnalyticsTrackerArgs {
  chain: Wallet.Cardano.ChainId;
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

  constructor({
    chain,
    view = ExtensionViews.Extended,
    analyticsDisabled = false,
    isPostHogEnabled = POSTHOG_ENABLED,
    excludedEvents = POSTHOG_EXCLUDED_EVENTS ?? ''
  }: AnalyticsTrackerArgs) {
    if (analyticsDisabled) return;
    this.userIdService = getUserIdService();
    this.matomoClient = new MatomoClient(chain, this.userIdService);
    this.excludedEvents = excludedEvents;

    if (isPostHogEnabled) {
      this.postHogClient = new PostHogClient(chain, this.userIdService, view);
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

  private async shouldOmitSendEventToPostHog() {
    const userTrackingType = await this.userIdService.getUserTrackingType();
    const isOptedOutUser = userTrackingType === UserTrackingType.Basic;
    return POSTHOG_OPTED_OUT_EVENTS_DISABLED && isOptedOutUser;
  }

  private isEventExcluded(action: PostHogAction) {
    return this.excludedEvents && this.excludedEvents.split(',').some((exclude: string) => action.startsWith(exclude));
  }
}

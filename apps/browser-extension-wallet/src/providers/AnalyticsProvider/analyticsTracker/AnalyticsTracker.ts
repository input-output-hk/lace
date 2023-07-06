import { EnhancedAnalyticsOptInStatus, SendEventProps, PostHogAction, PostHogFlows } from './types';
import { Wallet } from '@lace/cardano';
import { MatomoClient } from '../matomo';
import { POSTHOG_ENABLED, PostHogClient } from '../postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { UserIdService } from '@lib/scripts/types';
import { config } from '@src/config';

const { ENABLED_TRACKING_FLOWS } = config();

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
    // we can add page navigation to ENABLED_TRACKING_FLOWS list, to check if we want to track it or not as well
    await Promise.all([
      this.matomoClient?.sendPageNavigationEvent(path),
      this.postHogClient?.sendPageNavigationEvent(path)
    ]);
  }

  // TODO: rename to sendEventToMatomo  (https://input-output.atlassian.net/browse/LW-7197)
  async sendEvent(props: SendEventProps): Promise<void> {
    await this.matomoClient?.sendEvent(props);
    await this.userIdService.extendLifespan();
  }

  async sendEventToPostHog(
    action: PostHogAction,
    properties: Record<string, string | boolean> = {},
    flow?: PostHogFlows // create an enum for this
  ): Promise<void> {
    // adds an extra check to not track flows in production that are not approved yet, at the same time, if we find an issue with a flow in production, we can disable
    // should we do this only when production tracking mode is enabled?
    if (!ENABLED_TRACKING_FLOWS.includes(flow)) return;
    await this.postHogClient?.sendEvent(action, properties);
    await this.userIdService.extendLifespan();
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    this.matomoClient?.setChain(chain);
    this.postHogClient?.setChain(chain);
  }
}

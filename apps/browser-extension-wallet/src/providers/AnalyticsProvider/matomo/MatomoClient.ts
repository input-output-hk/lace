/* eslint-disable camelcase */
import MatomoTracker from 'matomo-tracker';
import { Wallet } from '@lace/cardano';
import { Metadata, MatomoSendEventProps } from '../analyticsTracker/types';
import { MATOMO_API_ENDPOINT, NETWORK_ID_TO_ANALYTICS_SITE_ID_MAP } from './config';
import { UserIdService } from '@lib/scripts/types';

/**
 * Matomo API reference:
 * https://developer.matomo.org/api-reference/tracking-api
 */
export class MatomoClient {
  private matomoTracker: typeof MatomoTracker;

  constructor(chain: Wallet.Cardano.ChainId, private userIdService: UserIdService) {
    if (!MATOMO_API_ENDPOINT) throw new Error('MATOMO_API_ENDPOINT url has not been provided');
    this.matomoTracker = new MatomoTracker(this.getMatomoSiteId(chain), MATOMO_API_ENDPOINT);
  }

  async getMetadata(): Promise<Metadata> {
    return {
      _id: await this.userIdService.getRandomizedUserId(),
      url: this.getAnalyticsURL()
    };
  }

  async sendPageNavigationEvent(pageTitle: string): Promise<void> {
    console.debug('[ANALYTICS] Logging page navigation event to Matomo', pageTitle);
    this.matomoTracker.track({
      ...(await this.getMetadata()),
      action_name: pageTitle
    });
  }

  async sendEvent({ category, action, name, value }: MatomoSendEventProps): Promise<void> {
    const payload = {
      ...(await this.getMetadata()),
      ca: 1,
      e_c: category,
      e_a: action,
      e_n: name,
      e_v: value
    };
    console.debug('[ANALYTICS] Logging event to Matomo', payload);
    this.matomoTracker.track(payload);
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    const siteId = this.getMatomoSiteId(chain);
    console.debug('[ANALYTICS] Changing Matomo site ID', siteId);
    this.matomoTracker = new MatomoTracker(siteId, MATOMO_API_ENDPOINT);
  }

  private getAnalyticsURL() {
    return `http://lace/${window.location.hash.replace('#/', '')}`;
  }

  protected getMatomoSiteId(chain: Wallet.Cardano.ChainId): number {
    return NETWORK_ID_TO_ANALYTICS_SITE_ID_MAP[chain.networkId];
  }
}

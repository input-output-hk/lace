/* eslint-disable camelcase */
import MatomoTracker from 'matomo-tracker';
import randomBytes from 'randombytes';
import { Wallet } from '@lace/cardano';
import { AnalyticsClient, EnhancedAnalyticsOptInStatus, Metadata, SendEventProps } from '../analyticsTracker/types';
import { ANALYTICS_API_ENDPOINT, NETWORK_ID_TO_ANALYTICS_SITE_ID_MAP } from './config';

/**
 * Matomo API reference:
 * https://developer.matomo.org/api-reference/tracking-api
 */
export class MatomoClient implements AnalyticsClient {
  private matomoTracker: typeof MatomoTracker;
  userId: string;

  constructor(chain: Wallet.Cardano.ChainId, private enhancedAnalyticsOptInStatus?: EnhancedAnalyticsOptInStatus) {
    this.userId = this.getUserId();
    if (!ANALYTICS_API_ENDPOINT) throw new Error('MATOMO_API_ENDPOINT url has not been provided');
    this.matomoTracker = new MatomoTracker(this.getMatomoSiteId(chain), ANALYTICS_API_ENDPOINT);
  }

  // TODO: implement with new requirements, provide one common, global implementation (in background service?)
  getUserId(): string {
    console.debug(`Analytics opt in status: ${this.enhancedAnalyticsOptInStatus}`);
    // eslint-disable-next-line no-magic-numbers
    return randomBytes(8).toString('hex');
  }

  getMetadata(): Metadata {
    return {
      _id: this.userId,
      url: this.getAnalyticsURL()
    };
  }

  sendPageNavigationEvent = (pageTitle: string): void => {
    this.matomoTracker.track({
      ...this.getMetadata(),
      action_name: pageTitle
    });
  };

  sendEvent = ({ category, action, name, value }: SendEventProps): void => {
    this.matomoTracker.track({
      ...this.getMetadata(),
      ca: 1,
      e_c: category,
      e_a: action,
      e_n: name,
      e_v: value
    });
  };

  setOptedInForEnhancedTracking(status: EnhancedAnalyticsOptInStatus): void {
    this.enhancedAnalyticsOptInStatus = status;
  }

  setSiteId(chain: Wallet.Cardano.ChainId): void {
    this.matomoTracker = new MatomoTracker(this.getMatomoSiteId(chain), ANALYTICS_API_ENDPOINT);
  }

  private getAnalyticsURL() {
    return `http://lace/${window.location.hash.replace('#/', '')}`;
  }

  protected getMatomoSiteId(chain: Wallet.Cardano.ChainId): number {
    return NETWORK_ID_TO_ANALYTICS_SITE_ID_MAP[chain.networkId];
  }
}

/* eslint-disable camelcase */
import MatomoTracker from 'matomo-tracker';
import randomBytes from 'randombytes';
import { Wallet } from '@lace/cardano';
import { AnalyticsConsentStatus, AnalyticsClient, Metadata, sendEventProps } from './types';
import { ANALYTICS_API_ENDPOINT, NETWORK_TO_ANALYTICS_SITE_ID_MAP } from './config';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';

/**
 * Matomo API reference:
 * https://developer.matomo.org/api-reference/tracking-api
 */
export class MatomoClient implements AnalyticsClient {
  private matomoTracker: typeof MatomoTracker;
  private allowCookies: boolean;
  userId: string;

  constructor(chain: Wallet.Cardano.ChainId, analyticsAccepted?: AnalyticsConsentStatus) {
    this.userId = this.getUserId();
    this.allowCookies = analyticsAccepted === AnalyticsConsentStatus.ACCEPTED;
    if (!ANALYTICS_API_ENDPOINT) throw new Error('MATOMO_API_ENDPOINT url has not been provided');
    this.matomoTracker = new MatomoTracker(this.getMatomoSiteId(chain), ANALYTICS_API_ENDPOINT);
  }

  // according to the docs _id must be a 16 characters hexadecimal string and address is bech32 format
  getUserId(): string {
    let userId = getValueFromLocalStorage('analyticsUserId');

    if (!userId) {
      // eslint-disable-next-line no-magic-numbers
      userId = randomBytes(8).toString('hex');
      saveValueInLocalStorage({ key: 'analyticsUserId', value: userId });
    }
    return userId;
  }

  getMetadata(): Metadata {
    return {
      ...(this.allowCookies && { cookie: 1 }),
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

  sendEvent = ({ category, action, name, value }: sendEventProps): void => {
    this.matomoTracker.track({
      ...this.getMetadata(),
      ca: 1,
      e_c: category,
      e_a: action,
      e_n: name,
      e_v: value
    });
  };

  private getAnalyticsURL() {
    return `http://lace/${window.location.hash.replace('#/', '')}`;
  }

  protected getMatomoSiteId(chain: Wallet.Cardano.ChainId): number {
    return NETWORK_TO_ANALYTICS_SITE_ID_MAP[chain.networkId];
  }

  toogleCookies(areEnabled: boolean): void {
    this.allowCookies = areEnabled;
  }
}

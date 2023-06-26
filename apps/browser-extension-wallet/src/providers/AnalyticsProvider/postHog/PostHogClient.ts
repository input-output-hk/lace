/* eslint-disable camelcase */
import posthog from 'posthog-js';
import randomBytes from 'randombytes';
import { Wallet } from '@lace/cardano';
import { AnalyticsClient, EnhancedAnalyticsOptInStatus, Metadata, SendEventProps } from '../analyticsTracker';
import {
  BASIC_ANALYTICS_CONFIG,
  ENHANCED_ANALYTICS_CONFIG,
  NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PUBLIC_POSTHOG_HOST
} from './config';

/**
 * PostHog API reference:
 * https://posthog.com/docs/libraries/js
 */
export class PostHogClient implements AnalyticsClient {
  userId: string;

  constructor(chain: Wallet.Cardano.ChainId, enhancedAnalyticsOptInStatus?: EnhancedAnalyticsOptInStatus) {
    this.userId = this.getUserId();
    posthog.init(this.getApiToken(chain), {
      api_host: PUBLIC_POSTHOG_HOST,
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      capture_pageleave: false,
      bootstrap: {
        distinctID: this.userId
      },
      disable_compression: true,
      ...(enhancedAnalyticsOptInStatus === EnhancedAnalyticsOptInStatus.OptedIn
        ? ENHANCED_ANALYTICS_CONFIG
        : BASIC_ANALYTICS_CONFIG)
    });
  }

  // TODO: implement with new requirements, provide one common, global implementation (in background service?)
  getUserId(): string {
    // eslint-disable-next-line no-magic-numbers
    return randomBytes(8).toString('hex');
  }

  getEventMetadata(): Metadata {
    return {
      url: this.getAnalyticsURL()
    };
  }

  sendPageNavigationEvent = (pageTitle: string): void => {
    posthog.capture('pageview', {
      ...this.getEventMetadata(),
      action_name: pageTitle
    });
  };

  sendEvent = ({ category, action, name, value }: SendEventProps): void => {
    posthog.capture(action, {
      ...this.getEventMetadata(),
      e_c: category,
      e_n: name,
      e_v: value
    });
  };

  setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): void {
    posthog.set_config(
      status === EnhancedAnalyticsOptInStatus.OptedIn ? ENHANCED_ANALYTICS_CONFIG : BASIC_ANALYTICS_CONFIG
    );
  }

  setSiteId(chain: Wallet.Cardano.ChainId): void {
    posthog.set_config({
      token: this.getApiToken(chain)
    });
  }

  private getAnalyticsURL() {
    return `http://lace/${window.location.hash.replace('#/', '')}`;
  }

  protected getApiToken(chain: Wallet.Cardano.ChainId): string {
    return NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkId];
  }
}

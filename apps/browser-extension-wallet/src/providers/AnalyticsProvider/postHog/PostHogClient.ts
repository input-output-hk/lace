/* eslint-disable camelcase */
import posthog from 'posthog-js';
import { Wallet } from '@lace/cardano';
import { ExtensionViews, PostHogAction, PostHogMetadata } from '../analyticsTracker';
import {
  DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PUBLIC_POSTHOG_HOST,
  PRODUCTION_TRACKING_MODE_ENABLED
} from './config';
import { UserIdService } from '@lib/scripts/types';

/**
 * PostHog API reference:
 * https://posthog.com/docs/libraries/js
 */
export class PostHogClient {
  private initialized: false;

  constructor(private chain: Wallet.Cardano.ChainId, private userIdService: UserIdService) {}

  async init(): Promise<void> {
    if (!PUBLIC_POSTHOG_HOST) throw new Error('PUBLIC_POSTHOG_HOST url has not been provided');

    posthog.init(this.getApiToken(this.chain), {
      request_batching: false,
      api_host: PUBLIC_POSTHOG_HOST,
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      capture_pageleave: false,
      disable_compression: true,
      // Disables PostHog user ID persistence - we manage ID ourselves with userIdService
      disable_persistence: true,
      disable_cookie: true,
      persistence: 'memory'
    });
  }

  sendPageNavigationEvent = async (): Promise<void> => {
    if (!this.initialized) {
      await this.init();
    }

    console.debug('[ANALYTICS] Logging page navigation event to PostHog');

    posthog.capture('$pageview', {
      ...(await this.getEventMetadata())
    });
  };

  sendEvent = async (action: PostHogAction, properties: Record<string, string | boolean> = {}): Promise<void> => {
    if (!this.initialized) {
      await this.init();
    }

    const payload = {
      ...(await this.getEventMetadata()),
      ...properties
    };

    console.debug('[ANALYTICS] Logging event to PostHog', action, payload);
    posthog.capture(String(action), payload);
  };

  setChain(chain: Wallet.Cardano.ChainId): void {
    const token = this.getApiToken(chain);
    console.debug('[ANALYTICS] Changing PostHog API token', token);
    posthog.set_config({
      token
    });
  }

  protected getApiToken(chain: Wallet.Cardano.ChainId): string {
    return PRODUCTION_TRACKING_MODE_ENABLED
      ? PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkMagic]
      : DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkMagic];
  }

  protected async getEventMetadata(): Promise<PostHogMetadata> {
    return {
      url: window.location.href,
      distinct_id: await this.userIdService.getId(),
      // TODO: Since we only have onboarding flow event implemented, we hardcoded this to extended view,
      // once we implement other flows, we'll need to make this dependable on the current user view (popup or extended) JIRA (TBD)
      view: ExtensionViews.Extended
    };
  }
}

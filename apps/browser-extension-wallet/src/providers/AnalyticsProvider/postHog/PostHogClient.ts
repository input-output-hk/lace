/* eslint-disable camelcase */
import posthog from 'posthog-js';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import { ExtensionViews, PostHogAction, PostHogMetadata } from '../analyticsTracker';
import {
  DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_TRACKING_MODE_ENABLED,
  PUBLIC_POSTHOG_HOST
} from './config';
import { UserIdService } from '@lib/scripts/types';
import { CHAIN_NAME_BY_NETWORK_MAGIC_MAPPPER } from '@src/utils/chain';

/**
 * PostHog API reference:
 * https://posthog.com/docs/libraries/js
 */
export class PostHogClient {
  constructor(
    private chain: Wallet.Cardano.ChainId,
    private userIdService: UserIdService,
    private view: ExtensionViews = ExtensionViews.Extended,
    private publicPostHogHost: string = PUBLIC_POSTHOG_HOST
  ) {
    if (!this.publicPostHogHost) throw new Error('PUBLIC_POSTHOG_HOST url has not been provided');

    posthog.init(this.getApiToken(this.chain), {
      request_batching: false,
      api_host: this.publicPostHogHost,
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      capture_pageleave: false,
      disable_compression: true,
      // Disables PostHog user ID persistence - we manage ID ourselves with userIdService
      disable_persistence: true,
      disable_cookie: true,
      persistence: 'memory',
      property_blacklist: ['$autocapture_disabled_server_side', '$device_id', '$time'],
      ip: true
    });
  }

  async sendPageNavigationEvent(): Promise<void> {
    console.debug('[ANALYTICS] Logging page navigation event to PostHog');

    posthog.capture('$pageview', {
      ...(await this.getEventMetadata())
    });
  }

  async sendAliasEvent(): Promise<void> {
    const { alias_id, distinct_id } = await this.getEventMetadata();
    // If one of this does not exist, should not send the alias event
    if (!alias_id || !distinct_id) {
      console.debug('[ANALYTICS] IDs were not found');
      return;
    }
    console.debug('[ANALYTICS] Linking temporary ID with permanent user ID');
    posthog.alias(alias_id, distinct_id);
  }

  async sendEvent(action: PostHogAction, properties: Record<string, string | boolean> = {}): Promise<void> {
    const payload = {
      ...(await this.getEventMetadata()),
      ...properties
    };

    console.debug('[ANALYTICS] Logging event to PostHog', action, payload);
    posthog.capture(String(action), payload);
  }

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
    // Check if it is opted in user
    const isPersistentId = await this.userIdService.getIsPersistentId();
    // There is no way to get the PK before creating/restoring the wallet. So this will be undefined if the wallet was not created
    const hashId = await this.userIdService.getHashId(CHAIN_NAME_BY_NETWORK_MAGIC_MAPPPER[this.chain.networkMagic]);
    // Gets temporary user id, this will be used as alias for opted in user, for opted out user keeps as distinct_id
    const userId = await this.userIdService.getId();
    // Checks if wallet has been created
    const hasTheWalletBeenCreated = !!hashId;
    const isOptedInUserWithHashId = hasTheWalletBeenCreated && isPersistentId;
    const idsMetadata = isOptedInUserWithHashId
      ? {
          distinct_id: hashId,
          alias_id: userId
        }
      : {
          distinct_id: userId
        };

    return {
      url: window.location.href,
      view: this.view,
      sent_at_local: dayjs().format(),
      ...idsMetadata
    };
  }
}

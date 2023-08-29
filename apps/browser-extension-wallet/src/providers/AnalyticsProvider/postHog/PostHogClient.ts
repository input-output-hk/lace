/* eslint-disable camelcase */
import posthog, { PostHog } from 'posthog-js';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import {
  ExtensionViews,
  PostHogAction,
  PostHogMetadata,
  PostHogProperties,
  PostHogPersonProperties,
  UserTrackingType,
  ExperimentName,
  ExperimentsConfig
} from '../analyticsTracker';
import {
  DEV_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP,
  DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_TRACKING_MODE_ENABLED,
  PUBLIC_POSTHOG_HOST
} from './config';
import { UserIdService } from '@lib/scripts/types';
import { Subscription, Subject } from 'rxjs';

export const experiments: ExperimentsConfig = {
  NftFolders: {
    variants: ['control', 'test'],
    defaultVariant: 'control'
  },
  NFTFolderButtonAlignment: {
    variants: ['control', 'center'],
    defaultVariant: 'control'
  }
};

/**
 * PostHog API reference:
 * https://posthog.com/docs/libraries/js
 */
export class PostHogClient {
  #enabledFlags: Subject<Array<string>>;
  #userTrackingType: UserTrackingType;
  constructor(
    private chain: Wallet.Cardano.ChainId,
    private userIdService: UserIdService,
    private view: ExtensionViews = ExtensionViews.Extended,
    private publicPostHogHost: string = PUBLIC_POSTHOG_HOST
  ) {
    if (!this.publicPostHogHost) throw new Error('PUBLIC_POSTHOG_HOST url has not been provided');
    this.#enabledFlags = new Subject();
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
      loaded: (posthogInstance: PostHog) => {
        posthogInstance.onFeatureFlags((flags) => {
          this.#enabledFlags.next(flags);
        });
      }
    });
  }

  async sendPageNavigationEvent(): Promise<void> {
    console.debug('[ANALYTICS] Logging page navigation event to PostHog');

    posthog.capture('$pageview', {
      ...(await this.getEventMetadata())
    });
  }

  async sendAliasEvent(): Promise<void> {
    const { id, alias } = await this.userIdService.getAliasProperties(this.chain.networkMagic);
    // If one of this does not exist, should not send the alias event
    if (!alias || !id) {
      console.debug('[ANALYTICS] IDs were not found');
      return;
    }
    console.debug('[ANALYTICS] Linking randomized ID with wallet-based ID');
    posthog.alias(alias, id);
  }

  async sendEvent(action: PostHogAction, properties: PostHogProperties = {}): Promise<void> {
    const payload = {
      ...(await this.getEventMetadata()),
      ...properties
    };

    console.debug('[ANALYTICS] Logging event to PostHog', action, payload);
    posthog.capture(String(action), payload);
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    const token = this.getApiToken(chain);
    this.chain = chain;
    console.debug('[ANALYTICS] Changing PostHog API token', token);
    posthog.set_config({
      token
    });
  }

  subscribeToRemoteFlags(callback: (params: Array<string>) => void): Subscription {
    return this.#enabledFlags.subscribe(callback);
  }

  /**
   * Should be used only with feature flags set by experiments, otherwise, getFeatureFlag will return a boolean
   */
  getFeatureFlagVariant(key: ExperimentName): string {
    return (
      (posthog.getFeatureFlag(key, {
        send_event: false
      }) as string) || experiments[key].defaultVariant
    );
  }

  /**
   * For testing purpose, this allows us to override the flags with any value
   */
  overrideFeatureFlags(flags: boolean | string[] | Record<string, string | boolean>): void {
    posthog.featureFlags.override(flags);
  }

  protected getApiToken(chain: Wallet.Cardano.ChainId): string {
    return PRODUCTION_TRACKING_MODE_ENABLED
      ? PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkMagic]
      : DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkMagic];
  }

  protected getProjectId(): number {
    return PRODUCTION_TRACKING_MODE_ENABLED
      ? PRODUCTION_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP[this.chain.networkMagic]
      : DEV_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP[this.chain.networkMagic];
  }

  protected async getEventMetadata(): Promise<PostHogMetadata> {
    return {
      url: window.location.href,
      view: this.view,
      sent_at_local: dayjs().format(),
      distinct_id: await this.userIdService.getUserId(this.chain.networkMagic),
      posthog_project_id: this.getProjectId(),
      ...(await this.getPersonProperties())
    };
  }

  protected async getPersonProperties(): Promise<PostHogPersonProperties | undefined> {
    const currentUserTrackingType = await this.userIdService.getUserTrackingType();

    if (!this.#userTrackingType) {
      this.#userTrackingType = currentUserTrackingType;
    }

    if (currentUserTrackingType === this.#userTrackingType) return;
    this.#userTrackingType = currentUserTrackingType;
    // eslint-disable-next-line consistent-return
    return { $set: { user_tracking_type: this.#userTrackingType } };
  }
}

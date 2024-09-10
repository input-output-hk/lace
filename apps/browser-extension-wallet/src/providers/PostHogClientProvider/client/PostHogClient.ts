/* eslint-disable camelcase */
import posthog from 'posthog-js';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import {
  ExtensionViews,
  PostHogMetadata,
  PostHogPersonProperties,
  UserTrackingType
} from '@providers/AnalyticsProvider/analyticsTracker';
import {
  DEV_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP,
  DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_TRACKING_MODE_ENABLED,
  POSTHOG_HOST,
  POSTHOG_ENABLED
} from './config';
import { BackgroundService, UserIdService } from '@lib/scripts/types';
import { experiments, fallbackConfiguration } from '@providers/ExperimentsProvider/config';
import { ExperimentName } from '@providers/ExperimentsProvider/types';
import { Subscription, BehaviorSubject } from 'rxjs';
import { PostHogAction, PostHogProperties } from '@lace/common';

type FeatureFlags = 'create-paper-wallet' | 'restore-paper-wallet';

/**
 * PostHog API reference:
 * https://posthog.com/docs/libraries/js
 */
export class PostHogClient<Action extends string = string> {
  protected static postHogClientInstance: PostHogClient;
  private userTrackingType: UserTrackingType;
  private currentUserTrackingType?: UserTrackingType;
  private hasPostHogInitialized$: BehaviorSubject<boolean>;
  private subscription: Subscription;
  private initSuccess: Promise<boolean>;
  featureFlags: {
    [key in FeatureFlags]: string | boolean;
  };
  constructor(
    private chain: Wallet.Cardano.ChainId,
    private userIdService: UserIdService,
    private backgroundServiceUtils: Pick<BackgroundService, 'getBackgroundStorage' | 'setBackgroundStorage'>,
    private view: ExtensionViews = ExtensionViews.Extended,
    private postHogHost: string = POSTHOG_HOST
  ) {
    if (!this.postHogHost) throw new Error('POSTHOG_HOST url has not been provided');
    const token = this.getApiToken(this.chain);
    if (!token) throw new Error(`posthog token has not been provided for chain: ${this.chain.networkId}`);
    this.hasPostHogInitialized$ = new BehaviorSubject(false);

    this.initSuccess = this.userIdService
      .getUserId(chain.networkMagic)
      .then((id) => {
        posthog.init(token, {
          request_batching: false,
          api_host: this.postHogHost,
          autocapture: false,
          disable_session_recording: true,
          capture_pageview: false,
          capture_pageleave: false,
          disable_compression: true,
          // Disables PostHog user ID persistence - we manage ID ourselves with userIdService
          disable_persistence: true,
          disable_cookie: true,
          persistence: 'memory',
          bootstrap: {
            distinctID: id,
            isIdentifiedID: true
          },
          property_blacklist: [
            '$autocapture_disabled_server_side',
            '$console_log_recording_enabled_server_side',
            '$device_id',
            '$session_recording_recorder_version_server_side',
            '$time'
          ]
        });
      })
      .then(() => true)
      .catch(() => {
        console.warn('Analytics failed');
        return false;
      });

    this.subscribeToDistinctIdUpdate();
    this.loadExperiments();
  }

  static getInstance(
    chain: Wallet.Cardano.ChainId,
    userIdService: UserIdService,
    {
      getBackgroundStorage,
      setBackgroundStorage
    }: Pick<BackgroundService, 'getBackgroundStorage' | 'setBackgroundStorage'>,
    view?: ExtensionViews
  ): PostHogClient {
    if (this.postHogClientInstance || !POSTHOG_ENABLED) return this.postHogClientInstance;
    this.postHogClientInstance = new PostHogClient(
      chain,
      userIdService,
      {
        getBackgroundStorage,
        setBackgroundStorage
      },
      view
    );
    return this.postHogClientInstance;
  }

  shutdown(): void {
    this.subscription?.unsubscribe();
  }

  subscribeToDistinctIdUpdate(): void {
    this.subscription = this.userIdService.userId$.subscribe(async ({ id, type }) => {
      this.currentUserTrackingType = type;
      // register must be called after posthog.init resolves
      if (await this.initSuccess) {
        posthog.register({
          distinct_id: id
        });
      }
    });
  }

  async sendSessionStartEvent(): Promise<void> {
    console.debug('[ANALYTICS] Logging Session Start Event');
    posthog.capture(String(PostHogAction.WalletSessionStartPageview), {
      ...(await this.getEventMetadata())
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

  // $merge_dangerously is needed to ensure merge works on users with merge restrictions
  // https://posthog.com/docs/product-analytics/identify
  async sendMergeEvent(extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex): Promise<void> {
    const id = await this.userIdService.generateWalletBasedUserId(extendedAccountPublicKey);
    if (!id) {
      console.debug('[ANALYTICS] Wallet-based ID not found');
      return;
    }

    console.debug('[ANALYTICS] Merging wallet-based ID into current user');
    posthog.capture('$merge_dangerously', {
      alias: id
    });
  }

  async sendEvent(action: Action, properties: PostHogProperties = {}): Promise<void> {
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

  subscribeToInitializationProcess(callback: (params: boolean) => void): Subscription {
    return this.hasPostHogInitialized$.subscribe(callback);
  }

  overrideFeatureFlags(flags: boolean | string[] | Record<string, string | boolean>): void {
    posthog.featureFlags.override(flags);
  }

  async getExperimentVariant(key: ExperimentName): Promise<string | boolean> {
    const variant = posthog?.getFeatureFlag(key, {
      send_event: false
    });
    // if we get a type of boolean means that the experiment is not running, so we return the fallback variant
    if (typeof variant === 'boolean') {
      return experiments[key].default;
    }

    // if the variant does not exist, we need to check for out cache
    if (!variant) {
      const backgroundStorage = await this.backgroundServiceUtils.getBackgroundStorage();
      return (backgroundStorage?.experimentsConfiguration?.[key] as string) || experiments[key].default;
    }

    return variant;
  }

  isFeatureEnabled(key: ExperimentName | string): boolean {
    try {
      const isEnabled = posthog.isFeatureEnabled(key);
      return isEnabled || false;
    } catch {
      return false;
    }
  }

  protected loadExperiments(): void {
    posthog.onFeatureFlags(async () => {
      const postHogExperimentConfiguration: Record<ExperimentName, string | boolean> =
        posthog.featureFlags.getFlagVariants();
      this.featureFlags = postHogExperimentConfiguration;
      const backgroundStorage = await this.backgroundServiceUtils.getBackgroundStorage();
      if (!backgroundStorage?.experimentsConfiguration && postHogExperimentConfiguration) {
        // save current posthog config in background storage
        await this.backgroundServiceUtils.setBackgroundStorage({
          experimentsConfiguration: postHogExperimentConfiguration
        });
      }

      // if we were not able to retrieve posthog experiment config, use local config
      if (!postHogExperimentConfiguration) {
        // override posthog experiment config with local
        posthog.featureFlags.override(backgroundStorage?.experimentsConfiguration || fallbackConfiguration);
      }
    });
    this.hasPostHogInitialized$.next(true);
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
      view: this.view,
      sent_at_local: dayjs().format(),
      distinct_id: await this.userIdService.getUserId(this.chain.networkMagic),
      posthog_project_id: this.getProjectId(),
      ...(await this.getPersonProperties())
    };
  }

  protected async getPersonProperties(): Promise<PostHogPersonProperties | undefined> {
    if (!this.userTrackingType) {
      this.userTrackingType = this.currentUserTrackingType;
      // set user_tracking_type in the first event
      return { $set: { user_tracking_type: this.userTrackingType } };
    }

    // eslint-disable-next-line consistent-return
    if (this.currentUserTrackingType === this.userTrackingType) return;
    this.userTrackingType = this.currentUserTrackingType;
    // update user_tracking_type if tracking type has changed
    return { $set: { user_tracking_type: this.userTrackingType } };
  }
}

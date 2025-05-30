/* eslint-disable camelcase, max-depth, sonarjs/cognitive-complexity, promise/no-nesting */
import posthog, { JsonType } from 'posthog-js';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import {
  ExtensionViews,
  PostHogMetadata,
  PostHogPersonProperties,
  UserTrackingType
} from '@providers/AnalyticsProvider/analyticsTracker';
import {
  allFeatureFlags,
  DEV_POSTHOG_PROJECT_ID,
  DEV_POSTHOG_TOKEN,
  featureFlagPayloadsInitialValue,
  featureFlagsByNetworkInitialValue,
  NETWORK_MAGIC_TO_NETWORK_NAME,
  POSTHOG_ENABLED,
  POSTHOG_HOST,
  PRODUCTION_POSTHOG_PROJECT_ID,
  PRODUCTION_POSTHOG_TOKEN,
  PRODUCTION_TRACKING_MODE_ENABLED
} from './config';
import { BackgroundService, BackgroundStorage, UserIdService } from '@lib/scripts/types';
import { BehaviorSubject, distinctUntilChanged, Observable, Subscription } from 'rxjs';
import { logger as commonLogger, PostHogAction, PostHogProperties } from '@lace/common';
import {
  ExperimentName,
  FeatureFlag,
  FeatureFlagCommonSchema,
  FeatureFlagDappExplorerSchema,
  FeatureFlagPayloads,
  FeatureFlagsByNetwork,
  FeatureFlags,
  RawFeatureFlagPayloads
} from '@lib/scripts/types/feature-flags';
import { config } from '@src/config';
import { featureFlagSchema, networksEnumSchema, NetworksEnumSchema } from '../schema';
import { contextLogger } from '@cardano-sdk/util';

// eslint-disable-next-line no-magic-numbers
const FEATURE_FLAG_CHECK_INTERVAL = config().POSTHOG_FEATURE_FLAG_CHECK_FREQUENCY_SECONDS * 1000;
const isNetworkOfExpectedSchema = (n: string): n is NetworksEnumSchema => networksEnumSchema.safeParse(n).success;

const logger = contextLogger(commonLogger, 'PostHogClient');

/**
 * PostHog API reference:
 * https://posthog.com/docs/libraries/js
 */
export class PostHogClient<Action extends string = string> {
  protected static postHogClientInstance: PostHogClient;
  private subscription: Subscription;
  private readonly optedInBeta$ = new BehaviorSubject(false);
  hasPostHogInitialized$ = new BehaviorSubject(false);
  featureFlagsByNetwork: FeatureFlagsByNetwork = featureFlagsByNetworkInitialValue;
  featureFlagPayloads: FeatureFlagPayloads = featureFlagPayloadsInitialValue;

  constructor(
    private chain: Wallet.Cardano.ChainId,
    private userIdService: UserIdService,
    private backgroundServiceUtils: Pick<BackgroundService, 'getBackgroundStorage' | 'setBackgroundStorage'>,
    private view: ExtensionViews = ExtensionViews.Extended,
    private postHogHost: string = POSTHOG_HOST
  ) {
    if (!this.postHogHost) throw new Error('POSTHOG_HOST url has not been provided');
    void this.initialize();
  }

  private async initialize() {
    const [storage, userId] = await Promise.all([
      this.backgroundServiceUtils.getBackgroundStorage(),
      this.userIdService.getUserId(this.chain.networkMagic)
    ]);
    this.optedInBeta$.next(storage?.optedInBeta ?? false);

    this.initializePosthogClient(userId, storage);
    this.subscribeToDistinctIdUpdate();
    this.loadFeatureFlags();

    this.hasPostHogInitialized$.next(true);
  }

  private initializePosthogClient(userId: string, storage: BackgroundStorage): void {
    const token = this.getApiToken();
    if (!token) throw new Error(`posthog token has not been provided for chain: ${this.chain.networkId}`);

    posthog.init(token, {
      request_batching: false,
      api_host: this.postHogHost,
      autocapture: false,
      opt_out_useragent_filter: true,
      disable_compression: true,
      disable_session_recording: true,
      capture_pageview: false,
      capture_pageleave: false,
      // Disables PostHog user ID persistence - we manage ID ourselves with userIdService
      disable_persistence: true,
      disable_cookie: true,
      persistence: 'memory',
      bootstrap: {
        distinctID: userId,
        isIdentifiedID: true,
        featureFlags: storage?.initialPosthogFeatureFlags,
        featureFlagPayloads: storage?.initialPosthogFeatureFlagPayloads
      },
      property_blacklist: [
        '$autocapture_disabled_server_side',
        '$console_log_recording_enabled_server_side',
        '$device_id',
        '$session_recording_recorder_version_server_side',
        '$time'
      ]
    });
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
    this.subscription = this.userIdService.userId$.subscribe(async ({ id }) => {
      posthog.register({
        distinct_id: id
      });
    });
  }

  async sendSessionStartEvent(): Promise<void> {
    logger.debug('Logging Session Start Event');
    posthog.capture(String(PostHogAction.WalletSessionStartPageview), {
      ...(await this.getEventMetadata())
    });
  }

  async sendPageNavigationEvent(): Promise<void> {
    logger.debug('Logging page navigation event to PostHog');

    posthog.capture('$pageview', {
      ...(await this.getEventMetadata())
    });
  }

  async sendAliasEvent(): Promise<void> {
    const { id, alias } = await this.userIdService.getAliasProperties(this.chain.networkMagic);
    // If one of this does not exist, should not send the alias event
    if (!alias || !id) {
      logger.debug('IDs were not found');
      return;
    }
    logger.debug('Linking randomized ID with wallet-based ID');
    posthog.alias(alias, id);
  }

  // $merge_dangerously is needed to ensure merge works on users with merge restrictions
  // https://posthog.com/docs/product-analytics/identify
  async sendMergeEvent(extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex): Promise<void> {
    const id = await this.userIdService.generateWalletBasedUserId(extendedAccountPublicKey);
    if (!id) {
      logger.debug('Wallet-based ID not found');
      return;
    }

    logger.debug('[ANALYTICS] Merging wallet-based ID into current user');
    posthog.capture('$merge_dangerously', {
      alias: id
    });
  }

  async sendEvent(action: Action, properties: PostHogProperties = {}): Promise<void> {
    const payload = {
      ...(await this.getEventMetadata()),
      ...properties
    };

    logger.debug('Logging event to PostHog', action, payload);
    posthog.capture(String(action), payload);
  }

  setChain(chain: Wallet.Cardano.ChainId): void {
    const token = this.getApiToken();
    this.chain = chain;
    logger.debug('Changing PostHog API token', token);
    posthog.set_config({
      token
    });
  }

  hasOptedInBeta(): Observable<boolean> {
    return this.optedInBeta$.pipe(distinctUntilChanged());
  }

  async setOptedInBeta(optedInBeta: boolean): Promise<void> {
    await this.backgroundServiceUtils.setBackgroundStorage({
      optedInBeta
    });

    this.optedInBeta$.next(optedInBeta);

    logger.debug('Changing Opted In Beta', optedInBeta);
  }

  isFeatureFlagEnabled(feature: FeatureFlag): boolean {
    const currentNetworkFeatureFlags =
      this.featureFlagsByNetwork[this.chain.networkMagic as Wallet.Cardano.NetworkMagics];
    return currentNetworkFeatureFlags[feature] || false;
  }

  getFeatureFlagPayload<T extends FeatureFlag>(featureFlag: T): FeatureFlagPayloads[T] {
    return this.featureFlagPayloads[featureFlag];
  }

  protected loadFeatureFlags(): void {
    // posthog.onFeatureFlags is not triggered on change, so we need to poll for changes
    setInterval(() => {
      try {
        posthog.reloadFeatureFlags();
      } catch (error) {
        logger.error('Failed to reload feature flags:', error);
      }
    }, FEATURE_FLAG_CHECK_INTERVAL);

    posthog.onFeatureFlags((_, loadedFeatureFlags) => {
      const loadedFeatureFlagPayloads = posthog.featureFlags.getFlagPayloads() as RawFeatureFlagPayloads;
      this.featureFlagPayloads = PostHogClient.parseFeaturePayloads(loadedFeatureFlagPayloads);

      for (const [networkMagic, networkName] of NETWORK_MAGIC_TO_NETWORK_NAME.entries()) {
        if (!isNetworkOfExpectedSchema(networkName)) return;

        for (const flagName of allFeatureFlags) {
          const isFeatureEnabled = !!loadedFeatureFlags[flagName];
          const payload = this.featureFlagPayloads[flagName];
          const allowedNetworks = payload ? payload.allowedNetworks : [];
          const enabledForGivenNetwork = allowedNetworks.includes(networkName);

          this.featureFlagsByNetwork = {
            ...this.featureFlagsByNetwork,
            [networkMagic]: {
              ...this.featureFlagsByNetwork[networkMagic as Wallet.Cardano.NetworkMagics],
              [flagName]: isFeatureEnabled && enabledForGivenNetwork
            }
          };
        }
      }

      // save current posthog config in background storage
      void this.backgroundServiceUtils.setBackgroundStorage({
        featureFlags: this.featureFlagsByNetwork,
        featureFlagPayloads: this.featureFlagPayloads,
        initialPosthogFeatureFlags: loadedFeatureFlags as FeatureFlags,
        initialPosthogFeatureFlagPayloads: loadedFeatureFlagPayloads
      });
    });
  }

  protected getApiToken(): string {
    return PRODUCTION_TRACKING_MODE_ENABLED ? PRODUCTION_POSTHOG_TOKEN : DEV_POSTHOG_TOKEN;
  }

  protected getProjectId(): number {
    return PRODUCTION_TRACKING_MODE_ENABLED ? PRODUCTION_POSTHOG_PROJECT_ID : DEV_POSTHOG_PROJECT_ID;
  }

  protected async getEventMetadata(): Promise<PostHogMetadata> {
    const storage = await this.backgroundServiceUtils.getBackgroundStorage();
    return {
      view: this.view,
      sent_at_local: dayjs().format(),
      distinct_id: await this.userIdService.getUserId(this.chain.networkMagic),
      posthog_project_id: this.getProjectId(),
      network: NETWORK_MAGIC_TO_NETWORK_NAME.get(this.chain.networkMagic),
      blockchain: storage.activeBlockchain ?? 'cardano',
      ...(await this.getPersonProperties())
    };
  }

  protected async getPersonProperties(): Promise<PostHogPersonProperties> {
    return { $set: { user_tracking_type: UserTrackingType.Enhanced, opted_in_beta: this.optedInBeta$.value } };
  }

  static parseFeaturePayloads(payloads: RawFeatureFlagPayloads): FeatureFlagPayloads {
    const payloadsByFeature: FeatureFlagPayloads = featureFlagPayloadsInitialValue;

    for (const [featureFlag, payload] of Object.entries(payloads) as [ExperimentName, JsonType][]) {
      try {
        if (featureFlag === ExperimentName.DAPP_EXPLORER) {
          // type-casting can be removed after Lace uses strict null checks
          payloadsByFeature[featureFlag] = featureFlagSchema.dappExplorer.parse(
            payload
          ) as FeatureFlagDappExplorerSchema;
          continue;
        }

        // type-casting can be removed after Lace uses strict null checks
        payloadsByFeature[featureFlag] = featureFlagSchema.common.parse(payload) as FeatureFlagCommonSchema;
      } catch (error) {
        logger.error(`Failed to parse payload for ${featureFlag}:`, error);
      }
    }

    return payloadsByFeature;
  }
}

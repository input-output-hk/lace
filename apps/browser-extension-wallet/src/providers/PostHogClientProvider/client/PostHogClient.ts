/* eslint-disable camelcase */
import posthog from 'posthog-js';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import {
  ExtensionViews,
  PostHogAction,
  PostHogMetadata,
  PostHogPersonProperties,
  PostHogProperties,
  UserTrackingType
} from '@providers/AnalyticsProvider/analyticsTracker';
import {
  DEV_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP,
  DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP,
  PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP,
  PRODUCTION_TRACKING_MODE_ENABLED,
  PUBLIC_POSTHOG_HOST,
  POSTHOG_ENABLED
} from './config';
import { BackgroundService, UserIdService } from '@lib/scripts/types';
import { experiments, fallbackConfiguration } from '@providers/ExperimentsProvider/config';
import { ExperimentName } from '@providers/ExperimentsProvider/types';
import { Subscription, BehaviorSubject } from 'rxjs';

/**
 * PostHog API reference:
 * https://posthog.com/docs/libraries/js
 */
export class PostHogClient {
  protected static postHogClientInstance: PostHogClient;
  private userTrackingType: UserTrackingType;
  private currentUserTrackingType?: UserTrackingType;
  private hasPostHogInitialized$: BehaviorSubject<boolean>;

  constructor(
    private chain: Wallet.Cardano.ChainId,
    private userIdService: UserIdService,
    private backgroundServiceUtils: Pick<BackgroundService, 'getBackgroundStorage' | 'setBackgroundStorage'>,
    private view: ExtensionViews = ExtensionViews.Extended,
    private publicPostHogHost: string = PUBLIC_POSTHOG_HOST
  ) {
    if (!this.publicPostHogHost) throw new Error('PUBLIC_POSTHOG_HOST url has not been provided');
    this.hasPostHogInitialized$ = new BehaviorSubject(false);

    this.userIdService
      .getUserId(chain.networkMagic)
      .then((id) => {
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
      .catch(() => {
        // TODO: do something with the error if we couldn't get the ID
      });

    this.subscribeToDistinctIdUpdate();
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
    this.userIdService.userTrackingType$.unsubscribe();
  }

  subscribeToDistinctIdUpdate(): void {
    this.userIdService.userTrackingType$.subscribe(async (trackingType) => {
      this.currentUserTrackingType = trackingType;
      const id = await this.userIdService.getUserId(this.chain.networkId);
      posthog.register({
        distinct_id: id
      });

      if (trackingType === UserTrackingType.Enhanced && !this.hasPostHogInitialized$.value) {
        this.loadExperiments();
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

  subscribeToInitializationProcess(callback: (params: boolean) => void): Subscription {
    return this.hasPostHogInitialized$.subscribe(callback);
  }

  overrideFeatureFlags(flags: boolean | string[] | Record<string, string | boolean>): void {
    posthog.featureFlags.override(flags);
  }

  async getExperimentVariant(key: ExperimentName): Promise<string> {
    const variant = posthog?.getFeatureFlag(key, {
      send_event: false
    });
    // if we get a type of boolean means that the experiment is not running, so we return the fallback variant
    if (typeof variant === 'boolean') {
      return experiments[key].defaultVariant;
    }

    // if the variant does not exist, we need to check for out cache
    if (!variant) {
      const backgroundStorage = await this.backgroundServiceUtils.getBackgroundStorage();
      return (backgroundStorage?.experimentsConfiguration[key] as string) || experiments[key].defaultVariant;
    }

    return variant;
  }

  protected loadExperiments(): void {
    posthog.onFeatureFlags(async () => {
      const postHogExperimentConfiguration = posthog.featureFlags.getFlagVariants();
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

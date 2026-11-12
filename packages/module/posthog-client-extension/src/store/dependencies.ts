import { PostHog } from 'posthog-node';
import { runtime } from 'webextension-polyfill';

import { getDefaultPosthogProperties } from './posthog-properties';

import type { LaceInitSync } from '@lace-contract/module';
import type { PostHogRelatedSideEffectDependencies } from '@lace-contract/posthog';

const FEATURE_FLAGS_POLLING_INTERVAL_MS = 1800000; // 30 minutes

export class PostHogPartialFlagsResponseError extends Error {
  public constructor(reason: string) {
    super(
      `PostHog /flags response is partial (${reason}); refusing to use a subset that may be missing keys`,
    );
    this.name = 'PostHogPartialFlagsResponseError';
  }
}

export const initializeSideEffectDependencies: LaceInitSync<
  PostHogRelatedSideEffectDependencies
> = (
  {
    runtime: {
      config: { postHogApiToken, postHogUrl },
    },
  },
  { logger },
) => {
  // PostHog's bulk getAllFlagsAndPayloads strips errorsWhileComputingFlags
  // and quotaLimited from the returned shape. Persisting a subset whose
  // missing keys read as "disabled" can leave SW boot snapshots stale across
  // restarts (LW: midnight dapp connector probe). We peek at the raw /flags
  // response via a fetch interceptor and reject getFeatureFlags so the
  // caller can skip the persist+emit step on a partial signal.
  let lastFlagsResponsePartialReason: string | undefined;

  const postHog = new PostHog(postHogApiToken, {
    host: postHogUrl,
    flushAt: 5,
    flushInterval: 500,
    featureFlagsPollingInterval: FEATURE_FLAGS_POLLING_INTERVAL_MS,
    disableGeoip: false,
    fetch: async (url, options) => {
      let response: Response;
      try {
        response = await globalThis.fetch(url, options as RequestInit);
      } catch (error) {
        if (url.includes('/flags'))
          lastFlagsResponsePartialReason = 'network request failed';
        throw error;
      }
      if (url.includes('/flags')) {
        try {
          const body = (await response.clone().json()) as {
            errorsWhileComputingFlags?: boolean;
            quotaLimited?: string[];
            flags?: unknown;
            featureFlags?: unknown;
          };
          if (!response.ok) {
            lastFlagsResponsePartialReason = `HTTP ${response.status}`;
          } else if (!body?.flags && !body?.featureFlags) {
            lastFlagsResponsePartialReason = 'missing flags';
          } else if (body?.errorsWhileComputingFlags) {
            lastFlagsResponsePartialReason = 'errorsWhileComputingFlags=true';
          } else if (body?.quotaLimited?.includes('feature_flags')) {
            lastFlagsResponsePartialReason =
              'quotaLimited includes feature_flags';
          }
        } catch (error) {
          lastFlagsResponsePartialReason = 'invalid response';
          logger.warn(
            'Failed to inspect PostHog /flags response for partial errors',
            error,
          );
        }
      }
      return response;
    },
  });

  return {
    posthog: {
      captureEvent: ({ distinctId, event, properties }) => {
        postHog.capture({ distinctId, event, properties });
      },
      getFeatureFlags: async distinctId => {
        lastFlagsResponsePartialReason = undefined;
        const result = await postHog.getAllFlagsAndPayloads(distinctId, {
          personProperties: { $app_version: runtime.getManifest().version },
        });
        if (lastFlagsResponsePartialReason) {
          throw new PostHogPartialFlagsResponseError(
            lastFlagsResponsePartialReason,
          );
        }
        return result;
      },
      identify: (distinctId, properties) => {
        if (properties) {
          postHog.identify({ distinctId, properties });
        }
      },
    },
    getDefaultPostHogEventProperties: () =>
      getDefaultPosthogProperties(globalThis.navigator, globalThis.location),
  };
};

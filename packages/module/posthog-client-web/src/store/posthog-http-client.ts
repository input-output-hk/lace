import type { PostHogClient } from '@lace-contract/posthog';
import type { JsonType } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

/**
 * Identifies this transport in PostHog. Deliberately not `posthog-node`: the
 * events reaching a project through this client were assembled here, and a
 * borrowed `$lib` would make the two indistinguishable in a query.
 */
const LIB = 'lace-posthog-web';
const LIB_VERSION = '1';

const DEFAULT_FLUSH_INTERVAL_MS = 3000;
const DEFAULT_MAX_BATCH_SIZE = 20;
const DEFAULT_MAX_QUEUED_EVENTS = 200;

/** One entry of `/batch/`'s `batch` array, as `posthog-node` sends it. */
type BatchMessage = {
  distinct_id: string;
  event: string;
  properties: Record<string, JsonType>;
  timestamp: string;
  uuid: string;
};

/**
 * `/flags/?v=2` answers with `flags`; the v1 shape (`featureFlags` +
 * `featureFlagPayloads`) is still served by older self-hosted deployments, so
 * both are accepted — `posthog-core`'s `normalizeFlagsResponse` does the same.
 */
type FlagDetail = {
  enabled?: boolean;
  variant?: string;
  metadata?: { payload?: string };
};

type FlagsResponseBody = {
  errorsWhileComputingFlags?: boolean;
  featureFlagPayloads?: Record<string, JsonType>;
  featureFlags?: Record<string, boolean | string>;
  flags?: Record<string, FlagDetail>;
  quotaLimited?: string[];
};

export class PostHogPartialFlagsResponseError extends Error {
  public constructor(reason: string) {
    super(
      `PostHog /flags response is partial (${reason}); refusing to use a subset that may be missing keys`,
    );
    this.name = 'PostHogPartialFlagsResponseError';
  }
}

export type PostHogHttpClientProps = {
  apiToken: string;
  /** PostHog ingestion origin; a trailing slash is tolerated. */
  host: string;
  fetch: typeof globalThis.fetch;
  logger: Logger;
  flushIntervalMs?: number;
  /** Events per `/batch/` request, and the queue length that forces a flush. */
  maxBatchSize?: number;
  /** Queue cap; the oldest events are dropped once it is reached. */
  maxQueuedEvents?: number;
  now?: () => Date;
  newUuid?: () => string;
};

export type PostHogHttpClient = PostHogClient & {
  /**
   * Sends everything queued and resolves once the last request settled. Never
   * rejects: a caller that cannot reach PostHog has nothing to recover.
   *
   * `keepalive` marks the request as one the browser must finish after the page
   * goes away — pass it only from a page-lifecycle handler.
   */
  flush: (options?: { keepalive?: boolean }) => Promise<void>;
  /**
   * Discards everything queued and cancels the pending flush, for a consent
   * revoke: without it the batching timer — or the page-hide flush, which fires
   * `keepalive` and so outlives the page — still delivers what was captured
   * before the opt-out.
   *
   * The client stays usable, because consent can be granted again. A batch
   * already handed to `fetch` is beyond recall.
   */
  reset: () => void;
};

const flagValues = (
  flags: Record<string, FlagDetail>,
): Record<string, boolean | string> => {
  const values: Record<string, boolean | string> = {};
  for (const [key, detail] of Object.entries(flags)) {
    const value = detail.variant ?? detail.enabled;
    if (value !== undefined) values[key] = value;
  }
  return values;
};

/** Payloads arrive JSON-encoded; a non-JSON body is a plain string value. */
const parsePayload = (payload: string): JsonType => {
  try {
    return JSON.parse(payload) as JsonType;
  } catch {
    return payload;
  }
};

const flagPayloads = (
  flags: Record<string, FlagDetail>,
): Record<string, JsonType> => {
  const payloads: Record<string, JsonType> = {};
  for (const [key, detail] of Object.entries(flags)) {
    const payload = detail.metadata?.payload;
    if (detail.enabled && payload !== undefined)
      payloads[key] = parsePayload(payload);
  }
  return payloads;
};

/**
 * Why a partial response is refused rather than merged: PostHog answers a
 * quota-limited or partially-computed evaluation with the keys it managed, and
 * the missing ones read as "disabled". Persisting that turns an outage into a
 * feature rollback.
 */
const partialFlagsReason = (body: FlagsResponseBody): string | undefined => {
  if (body.errorsWhileComputingFlags) return 'errorsWhileComputingFlags=true';
  if (body.quotaLimited?.includes('feature_flags'))
    return 'quotaLimited includes feature_flags';
  return undefined;
};

/**
 * A PostHog client for a plain web page, speaking the same HTTP API
 * `posthog-node` does: events to `POST /batch/`, flags to `POST /flags/?v=2`.
 *
 * Events are queued and flushed on a timer that exists only while the queue is
 * non-empty, so an idle page makes no requests. Delivery is best-effort: a
 * failed batch is dropped, never retried — a guest page that cannot reach
 * PostHog must not grow an unbounded queue or hammer a dead host, and the e2e
 * build points it at an unresolvable one on purpose.
 *
 * An empty token or host disables the client outright: every capture is
 * discarded and `getFeatureFlags` rejects, rather than sending traffic that can
 * only 401.
 */
export const createPostHogHttpClient = ({
  apiToken,
  host,
  fetch,
  logger,
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
  maxBatchSize = DEFAULT_MAX_BATCH_SIZE,
  maxQueuedEvents = DEFAULT_MAX_QUEUED_EVENTS,
  now = () => new Date(),
  newUuid = () => globalThis.crypto.randomUUID(),
}: PostHogHttpClientProps): PostHogHttpClient => {
  const isConfigured = apiToken.length > 0 && host.length > 0;
  const origin = host.replace(/\/+$/, '');
  const queue: BatchMessage[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  const clearFlushTimer = () => {
    if (flushTimer === undefined) return;
    clearTimeout(flushTimer);
    flushTimer = undefined;
  };

  const send = async (batch: BatchMessage[], keepalive: boolean) => {
    try {
      const response = await fetch(`${origin}/batch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiToken,
          batch,
          sent_at: now().toISOString(),
        }),
        keepalive,
      });
      if (!response.ok) {
        logger.debug(`PostHog /batch/ responded ${response.status}`);
      }
    } catch (error) {
      // Debug, not warn: carbon runs at LOG_LEVEL error, and an unreachable
      // analytics host must not write to a console an e2e spec reads.
      logger.debug('Failed to send PostHog events', error);
    }
  };

  const flush = async ({ keepalive = false } = {}) => {
    clearFlushTimer();
    while (queue.length > 0) {
      // splice, so a concurrent flush cannot pick up the same messages.
      await send(queue.splice(0, maxBatchSize), keepalive);
    }
  };

  const scheduleFlush = () => {
    if (flushTimer !== undefined) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      void flush();
    }, flushIntervalMs);
  };

  const enqueue = (
    distinctId: string,
    event: string,
    properties: Record<string, JsonType>,
  ) => {
    if (!isConfigured) return;
    queue.push({
      distinct_id: distinctId,
      event,
      properties: { ...properties, $lib: LIB, $lib_version: LIB_VERSION },
      timestamp: now().toISOString(),
      uuid: newUuid(),
    });
    if (queue.length > maxQueuedEvents)
      queue.splice(0, queue.length - maxQueuedEvents);
    if (queue.length >= maxBatchSize) {
      void flush();
      return;
    }
    scheduleFlush();
  };

  return {
    captureEvent: ({ distinctId, event, properties }) => {
      enqueue(distinctId, event, properties ?? {});
    },
    flush,
    getFeatureFlags: async distinctId => {
      if (!isConfigured)
        throw new Error('PostHog is not configured (no API token or host)');
      const response = await fetch(`${origin}/flags/?v=2&config=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distinct_id: distinctId,
          group_properties: {},
          groups: {},
          person_properties: {},
          token: apiToken,
        }),
      });
      if (!response.ok)
        throw new Error(`PostHog /flags responded ${response.status}`);
      const body = (await response.json()) as FlagsResponseBody;
      const partialReason = partialFlagsReason(body);
      if (partialReason)
        throw new PostHogPartialFlagsResponseError(partialReason);
      if (body.flags)
        return {
          featureFlagPayloads: flagPayloads(body.flags),
          featureFlags: flagValues(body.flags),
        };
      return {
        featureFlagPayloads: body.featureFlagPayloads ?? {},
        featureFlags: body.featureFlags ?? {},
      };
    },
    // Person properties, so they go under `$set` — a bare property on an
    // `$identify` event would be an event property and never reach the person.
    identify: (distinctId, properties) => {
      if (!properties) return;
      enqueue(distinctId, '$identify', { $set: properties });
    },
    reset: () => {
      clearFlushTimer();
      queue.length = 0;
    },
  };
};

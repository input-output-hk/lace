import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPostHogHttpClient,
  PostHogPartialFlagsResponseError,
} from '../../src/store/posthog-http-client';

import type { PostHogHttpClientProps } from '../../src/store/posthog-http-client';
import type { Logger } from 'ts-log';
import type { Mock } from 'vitest';

const FLUSH_INTERVAL_MS = 3000;
const HOST = 'https://posthog.test';

type FetchMock = Mock<
  (
    url: string,
    options: {
      body: string;
      headers: Record<string, string>;
      keepalive?: boolean;
      method: string;
    },
  ) => Promise<Response>
>;

type SentBatch = {
  api_key: string;
  batch: {
    distinct_id: string;
    event: string;
    properties: Record<string, unknown>;
    timestamp: string;
    uuid: string;
  }[];
  sent_at: string;
};

const okResponse = (body: unknown = {}) =>
  ({ json: async () => body, ok: true, status: 200 } as Response);

const logger: Logger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  trace: vi.fn(),
  warn: vi.fn(),
};

const createClient = ({
  respond = async () => okResponse(),
  ...props
}: Partial<PostHogHttpClientProps> & {
  respond?: () => Promise<Response>;
} = {}) => {
  const fetch = vi.fn(respond) as unknown as FetchMock;
  const client = createPostHogHttpClient({
    apiToken: 'token',
    fetch: fetch as unknown as typeof globalThis.fetch,
    flushIntervalMs: FLUSH_INTERVAL_MS,
    host: HOST,
    logger,
    maxBatchSize: 3,
    newUuid: () => 'uuid-1',
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    ...props,
  });
  return { client, fetch };
};

const batchBody = (fetch: FetchMock, call = 0): SentBatch =>
  JSON.parse(fetch.mock.calls[call][1].body) as SentBatch;

describe('posthog-client-web/posthog-http-client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('captureEvent', () => {
    it('sends one /batch/ request holding every event queued in the interval', async () => {
      const { client, fetch } = createClient();

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      client.captureEvent({
        distinctId: 'user-1',
        event: 'b',
        properties: { interface: 'carbon' },
      });
      expect(fetch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe(`${HOST}/batch/`);
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(options.keepalive).toBe(false);
      expect(batchBody(fetch)).toEqual({
        api_key: 'token',
        batch: [
          {
            distinct_id: 'user-1',
            event: 'a',
            properties: { $lib: 'lace-posthog-web', $lib_version: '1' },
            timestamp: '2026-01-01T00:00:00.000Z',
            uuid: 'uuid-1',
          },
          {
            distinct_id: 'user-1',
            event: 'b',
            properties: {
              $lib: 'lace-posthog-web',
              $lib_version: '1',
              interface: 'carbon',
            },
            timestamp: '2026-01-01T00:00:00.000Z',
            uuid: 'uuid-1',
          },
        ],
        sent_at: '2026-01-01T00:00:00.000Z',
      });
    });

    it('flushes without waiting once the batch size is reached', async () => {
      const { client, fetch } = createClient();

      for (const event of ['a', 'b', 'c'])
        client.captureEvent({ distinctId: 'user-1', event });
      await vi.advanceTimersByTimeAsync(0);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(batchBody(fetch).batch).toHaveLength(3);
    });

    it('splits a queue larger than the batch size across requests', async () => {
      const { client, fetch } = createClient({ maxBatchSize: 2 });

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      client.captureEvent({ distinctId: 'user-1', event: 'b' });
      client.captureEvent({ distinctId: 'user-1', event: 'c' });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(batchBody(fetch, 0).batch).toHaveLength(2);
      expect(batchBody(fetch, 1).batch).toHaveLength(1);
    });

    it('makes no request while nothing is queued', async () => {
      const { client, fetch } = createClient();

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS * 10);

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('drops the oldest events once the queue cap is reached', async () => {
      const { client, fetch } = createClient({
        maxBatchSize: 10,
        maxQueuedEvents: 2,
      });

      for (const event of ['a', 'b', 'c'])
        client.captureEvent({ distinctId: 'user-1', event });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(batchBody(fetch).batch.map(message => message.event)).toEqual([
        'b',
        'c',
      ]);
    });
  });

  describe('delivery failures', () => {
    it('swallows an unreachable host and keeps accepting events', async () => {
      const { client, fetch } = createClient({
        respond: async () => {
          throw new TypeError('Failed to fetch');
        },
      });

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
      await expect(client.flush()).resolves.toBeUndefined();

      client.captureEvent({ distinctId: 'user-1', event: 'b' });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not resend a failed batch', async () => {
      const { client, fetch } = createClient({
        respond: async () => {
          throw new TypeError('Failed to fetch');
        },
      });

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
      await client.flush();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('drops a batch the server rejected', async () => {
      const { client, fetch } = createClient({
        respond: async () =>
          ({ json: async () => ({}), ok: false, status: 401 } as Response),
      });

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
      await client.flush();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'PostHog /batch/ responded 401',
      );
    });
  });

  describe('flush', () => {
    it('sends the queue immediately, marking the request keepalive', async () => {
      const { client, fetch } = createClient();

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      await client.flush({ keepalive: true });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][1].keepalive).toBe(true);

      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('discards the queue rather than letting the timer deliver it', async () => {
      const { client, fetch } = createClient();

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      client.reset();
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS * 2);

      expect(fetch).not.toHaveBeenCalled();
    });

    it('sends nothing when the page then hides', async () => {
      const { client, fetch } = createClient();

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      client.reset();
      await client.flush({ keepalive: true });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('keeps the client usable, because consent can be granted again', async () => {
      const { client, fetch } = createClient();

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      client.reset();
      client.captureEvent({ distinctId: 'user-2', event: 'b' });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(batchBody(fetch).batch).toEqual([
        expect.objectContaining({ distinct_id: 'user-2', event: 'b' }),
      ]);
    });
  });

  describe('identify', () => {
    it('sends person properties as $set on an $identify event', async () => {
      const { client, fetch } = createClient();

      client.identify('user-1', { num_wallets: 2 });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(batchBody(fetch).batch[0]).toMatchObject({
        distinct_id: 'user-1',
        event: '$identify',
        properties: { $set: { num_wallets: 2 } },
      });
    });

    it('sends nothing when there are no properties to set', async () => {
      const { client, fetch } = createClient();

      client.identify('user-1');
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('getFeatureFlags', () => {
    it('posts the distinct id to /flags/ and reads the v2 shape', async () => {
      const { client, fetch } = createClient({
        respond: async () =>
          okResponse({
            flags: {
              disabled: { enabled: false },
              variant: {
                enabled: true,
                metadata: { payload: '{"size":2}' },
                variant: 'blue',
              },
            },
          }),
      });

      await expect(client.getFeatureFlags('user-1')).resolves.toEqual({
        featureFlagPayloads: { variant: { size: 2 } },
        featureFlags: { disabled: false, variant: 'blue' },
      });
      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe(`${HOST}/flags/?v=2&config=true`);
      expect(JSON.parse(options.body)).toEqual({
        distinct_id: 'user-1',
        group_properties: {},
        groups: {},
        person_properties: {},
        token: 'token',
      });
    });

    it('reads the v1 shape a self-hosted deployment may still serve', async () => {
      const { client } = createClient({
        respond: async () =>
          okResponse({
            featureFlagPayloads: { legacy: { size: 1 } },
            featureFlags: { legacy: true },
          }),
      });

      await expect(client.getFeatureFlags('user-1')).resolves.toEqual({
        featureFlagPayloads: { legacy: { size: 1 } },
        featureFlags: { legacy: true },
      });
    });

    it('keeps a non-JSON payload as its raw string', async () => {
      const { client } = createClient({
        respond: async () =>
          okResponse({
            flags: {
              plain: { enabled: true, metadata: { payload: 'not json' } },
            },
          }),
      });

      await expect(client.getFeatureFlags('user-1')).resolves.toEqual({
        featureFlagPayloads: { plain: 'not json' },
        featureFlags: { plain: true },
      });
    });

    it('rejects a response computed with errors', async () => {
      const { client } = createClient({
        respond: async () =>
          okResponse({ errorsWhileComputingFlags: true, flags: {} }),
      });

      await expect(client.getFeatureFlags('user-1')).rejects.toBeInstanceOf(
        PostHogPartialFlagsResponseError,
      );
    });

    it('rejects a quota-limited response', async () => {
      const { client } = createClient({
        respond: async () =>
          okResponse({ flags: {}, quotaLimited: ['feature_flags'] }),
      });

      await expect(client.getFeatureFlags('user-1')).rejects.toBeInstanceOf(
        PostHogPartialFlagsResponseError,
      );
    });

    it('rejects an error status', async () => {
      const { client } = createClient({
        respond: async () =>
          ({ json: async () => ({}), ok: false, status: 503 } as Response),
      });

      await expect(client.getFeatureFlags('user-1')).rejects.toThrow(
        'PostHog /flags responded 503',
      );
    });
  });

  describe('without an API token', () => {
    it('sends no events', async () => {
      const { client, fetch } = createClient({ apiToken: '' });

      client.captureEvent({ distinctId: 'user-1', event: 'a' });
      client.identify('user-1', { num_wallets: 2 });
      await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects a feature flag request rather than reading as all-off', async () => {
      const { client } = createClient({ apiToken: '' });

      await expect(client.getFeatureFlags('user-1')).rejects.toThrow(
        'PostHog is not configured',
      );
    });
  });
});

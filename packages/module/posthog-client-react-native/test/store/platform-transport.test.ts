import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { initializeSideEffectDependencies } from '../../src/store/dependencies';

import type PostHog from 'posthog-react-native';
import type { PostHogOptions } from 'posthog-react-native';

const native = vi.hoisted(() => ({
  Platform: { OS: 'ios', Version: '17.4', select: () => undefined },
  AppState: { addEventListener: vi.fn() },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));
const transport = vi.hoisted(() => {
  const response = {
    body: { featureFlags: { MOBILE_TEST: true } } as unknown,
  };
  return {
    response,
    fetch: vi.fn(
      async (_url: string, _options: { body?: string }) =>
        new Response(JSON.stringify(response.body), { status: 200 }),
    ),
  };
});
const sdkState = vi.hoisted(() => ({
  clients: [] as PostHog[],
  restoreNative: () => {},
}));

vi.mock('react-native', () => native);
vi.mock('expo-application', () => ({ nativeApplicationVersion: '2.1.0' }));
vi.mock('posthog-react-native', async () => {
  const { createRequire, Module } = await import('node:module');
  const { dirname, join } = await import('node:path');
  const require = createRequire(import.meta.url);
  const nativePath = require.resolve('react-native');
  const previous = require.cache[nativePath];
  const nativeModule = new Module(nativePath);
  nativeModule.exports = native;
  nativeModule.loaded = true;
  require.cache[nativePath] = nativeModule;
  sdkState.restoreNative = () => {
    if (previous) require.cache[nativePath] = previous;
    else delete require.cache[nativePath];
  };
  // The published SDK is CommonJS; replace only its native boundary, retaining its real transport.
  const { PostHog: SDK } = require(join(
    dirname(require.resolve('posthog-react-native')),
    'posthog-rn.js',
  )) as { PostHog: typeof PostHog };
  return {
    default: class extends SDK {
      public constructor(token: string, options: PostHogOptions) {
        super(token, {
          ...options,
          persistence: 'memory',
          disableCompression: true,
          disableRemoteConfig: true,
          flushInterval: 0,
          fetchRetryCount: 0,
        });
        sdkState.clients.push(this);
      }
    },
  };
});

afterEach(async () => {
  await Promise.all(sdkState.clients.map(async client => client.shutdown()));
  sdkState.clients.length = 0;
  transport.fetch.mockClear();
  transport.response.body = { featureFlags: { MOBILE_TEST: true } };
  vi.unstubAllGlobals();
});
afterAll(() => {
  sdkState.restoreNative();
});

const makeClient = (platform: string) => {
  native.Platform.OS = platform;
  vi.stubGlobal('fetch', transport.fetch);
  return initializeSideEffectDependencies(
    {
      runtime: {
        config: {
          postHogApiToken: 'test-token',
          postHogUrl: 'https://example.test',
        },
      },
    } as never,
    {} as never,
  ).posthog;
};

describe.each(['ios', 'android'])(
  'real PostHog SDK transport on %s',
  platform => {
    it('sends platform on capture, SDK identity events, person updates, and flag requests', async () => {
      const posthog = makeClient(platform);

      await posthog.getFeatureFlags('anonymous');
      posthog.captureEvent({
        distinctId: 'test-user',
        event: 'Mobile action',
        properties: {},
      });
      posthog.identify('test-user', {
        language: 'en',
        platform: 'stale-platform',
      });
      await posthog.getFeatureFlags('test-user');
      await sdkState.clients[0].flush();

      const requests = transport.fetch.mock.calls.map(([url, options]) => ({
        url: String(url),
        body: JSON.parse(options.body ?? '{}') as {
          person_properties?: Record<string, unknown>;
          batch?: { event: string; properties: Record<string, unknown> }[];
        },
      }));
      const flags = requests.filter(request => request.url.includes('/flags/'));
      expect(flags.length).toBeGreaterThanOrEqual(2);
      for (const request of flags) {
        expect(request.body.person_properties).toMatchObject({
          platform,
          $lib: 'posthog-react-native',
        });
      }
      const events = requests.flatMap(request => request.body.batch ?? []);
      expect(
        events.find(event => event.event === 'Mobile action')?.properties,
      ).toMatchObject({ platform });
      expect(
        events.find(event => event.event === '$identify')?.properties,
      ).toMatchObject({
        platform,
        $set: { platform, language: 'en' },
      });
    });
    it.each([
      ['incomplete response', {}],
      ['null legacy flags', { featureFlags: null }],
      ['array legacy flags', { featureFlags: [] }],
      ['null detailed flags', { flags: null }],
      ['array detailed flags', { flags: [] }],
      ['empty flag detail', { flags: { BUY_FLOW: {} } }],
      [
        'metadata-only flag detail',
        { flags: { BUY_FLOW: { metadata: { payload: '{}' } } } },
      ],
      ['null legacy flag value', { featureFlags: { BUY_FLOW: null } }],
      [
        'malformed detailed flags alongside legacy flags',
        { flags: null, featureFlags: { BUY_FLOW: true } },
      ],
      [
        'partially computed flags',
        { featureFlags: { PARTIAL: true }, errorsWhileComputingFlags: true },
      ],
      ['quota-limited response', { quotaLimited: ['feature_flags'] }],
      [
        'malformed quota marker',
        { featureFlags: {}, quotaLimited: 'feature_flags' },
      ],
      [
        'quota-limited legacy flags',
        { featureFlags: {}, quotaLimited: ['feature_flags'] },
      ],
      [
        'quota-limited detailed flags',
        { flags: {}, quotaLimited: ['feature_flags'] },
      ],
    ])(
      'preserves known flags on %s and recovers after a complete response',
      async (_name, body) => {
        transport.response.body = {
          featureFlags: { BUY_FLOW: true },
          featureFlagPayloads: { BUY_FLOW: { cohort: 'test' } },
        };
        const posthog = makeClient(platform);
        const enabled = {
          featureFlags: { BUY_FLOW: true },
          featureFlagPayloads: { BUY_FLOW: { cohort: 'test' } },
        };
        await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual(
          enabled,
        );

        transport.response.body = body;
        await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({});
        expect(sdkState.clients[0].getFeatureFlagsAndPayloads()).toEqual({
          flags: enabled.featureFlags,
          payloads: enabled.featureFlagPayloads,
        });

        transport.response.body = {
          featureFlags: { BUY_FLOW: true, RECOVERY: true },
        };
        await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({
          featureFlags: { BUY_FLOW: true, RECOVERY: true },
          featureFlagPayloads: {},
        });
      },
    );
    it.each([
      ['legacy', { featureFlags: {} }],
      ['detailed', { flags: {} }],
    ])(
      'accepts complete %s empty flags and unrelated quotas',
      async (_name, emptyFlags) => {
        transport.response.body = {
          featureFlags: { BUY_FLOW: true },
          quotaLimited: ['events'],
        };
        const posthog = makeClient(platform);
        await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({
          featureFlags: { BUY_FLOW: true },
          featureFlagPayloads: {},
        });

        transport.response.body = { featureFlags: { BUY_FLOW: false } };
        await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({
          featureFlags: { BUY_FLOW: false },
          featureFlagPayloads: {},
        });

        transport.response.body = emptyFlags;
        await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({
          featureFlags: {},
          featureFlagPayloads: {},
        });
      },
    );
    it('accepts detailed boolean and variant values with their payloads', async () => {
      transport.response.body = {
        flags: {
          BUY_FLOW: {
            enabled: true,
            metadata: { payload: '{"cohort":"test"}' },
          },
          DISABLED: { enabled: false },
          VARIANT: {
            enabled: true,
            variant: 'cohort-b',
            metadata: { payload: '{"variant":2}' },
          },
        },
      };
      const posthog = makeClient(platform);
      await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({
        featureFlags: { BUY_FLOW: true, DISABLED: false, VARIANT: 'cohort-b' },
        featureFlagPayloads: {
          BUY_FLOW: { cohort: 'test' },
          VARIANT: { variant: 2 },
        },
      });
    });
  },
);

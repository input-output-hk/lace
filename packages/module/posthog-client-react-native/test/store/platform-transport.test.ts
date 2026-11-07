import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { initializeSideEffectDependencies } from '../../src/store/dependencies';

import type PostHog from 'posthog-react-native';
import type { PostHogOptions } from 'posthog-react-native';

const native = vi.hoisted(() => ({
  Platform: { OS: 'ios', Version: '17.4', select: () => undefined },
  AppState: { addEventListener: vi.fn() },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));
const transport = vi.hoisted(() => ({
  fetch: vi.fn(async (_url: string, _options: { body?: string }) => ({
    status: 200,
    json: async () => ({ featureFlags: { MOBILE_TEST: true } }),
    text: async () => '',
  })),
}));
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
  vi.unstubAllGlobals();
});
afterAll(() => {
  sdkState.restoreNative();
});

describe.each(['ios', 'android'])(
  'real PostHog SDK transport on %s',
  platform => {
    it('sends platform on capture, SDK identity events, person updates, and flag requests', async () => {
      native.Platform.OS = platform;
      vi.stubGlobal('fetch', transport.fetch);
      const { posthog } = initializeSideEffectDependencies(
        {
          runtime: {
            config: {
              postHogApiToken: 'test-token',
              postHogUrl: 'https://example.test',
            },
          },
        } as never,
        {} as never,
      );

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
  },
);

import { Cardano } from '@cardano-sdk/core';
import { BITCOIN_FEATURE_FLAG } from '@lace-contract/bitcoin-context';
import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import { FailureId } from '@lace-contract/failures';
import { ModuleName } from '@lace-contract/module';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { Milliseconds } from '@lace-lib/util';
import { firstValueFrom, isObservable } from 'rxjs';
import { expect, it, vi } from 'vitest';

import { sdkCardanoAppModule } from '../src/cardano-app-module';
import { createLaceWallet } from '../src/create-lace-wallet';
import * as m from '../src/modules-cardano';
import { createPasskeyVaultModule } from '../src/passkey-vault-module';

import type { AnalyticsProvider } from '@lace-contract/analytics';
import type {
  KeyValueStorage,
  KeyValueStorageDependencies,
  LaceInit,
  LaceModuleStoreInit,
} from '@lace-contract/module';
import type { PasskeyKeySource } from '@lace-lib/passkey';

// Records every call the running wallet makes to the SDK's own analytics
// provider while still delegating to it.
const analyticsProvider = vi.hoisted(() => ({
  calls: [] as Parameters<AnalyticsProvider['trackAnalyticsEvent']>[],
  results: [] as unknown[],
}));
vi.mock('../src/base-module-store/init', async importOriginal => {
  const original = await importOriginal<{
    default: LaceInit<LaceModuleStoreInit>;
  }>();
  return {
    default: async (
      ...args: Parameters<typeof original.default>
    ): Promise<LaceModuleStoreInit> => {
      const init = await original.default(...args);
      const trackAnalyticsEvent =
        init.sideEffectDependencies?.trackAnalyticsEvent;
      if (!trackAnalyticsEvent) return init;
      return {
        ...init,
        sideEffectDependencies: {
          ...init.sideEffectDependencies,
          trackAnalyticsEvent: (...call) => {
            analyticsProvider.calls.push(call);
            const result = trackAnalyticsEvent(...call);
            analyticsProvider.results.push(result);
            return result;
          },
        },
      };
    },
  };
});

const cardanoFlags = [
  { key: FEATURE_FLAG_CARDANO },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];

const cardanoConfig = {
  defaultFeatureFlags: cardanoFlags,
  extraFeatureFlags: [],
  defaultTestnetChainId: Cardano.ChainIds.Preprod,
  cardanoProvider: {
    tipPollFrequency: Milliseconds(30_000),
    blockfrostConfigs: {
      1: {
        clientConfig: {
          baseUrl: 'https://cardano-preprod.blockfrost.io',
          apiVersion: 'v0' as const,
          projectId: 'startup-test',
        },
        rateLimiterConfig: {
          size: 500,
          increaseAmount: 10,
          increaseInterval: Milliseconds(1000),
        },
      },
    },
  },
  cexplorerUrls: { 1: 'https://preprod.cexplorer.io' },
};

/**
 * The in-memory storage module, exposing the key-value store that holds the
 * wallet's persisted redux state.
 */
const createInspectableStorage = () => {
  let reduxStorage: KeyValueStorage<string, unknown> | undefined;
  const module: typeof m.storageInMemory = {
    ...m.storageInMemory,
    store: m.storageInMemory.store && {
      ...m.storageInMemory.store,
      load: async () => {
        const loaded = await m.storageInMemory.store!.load();
        return {
          ...loaded,
          default: async (...args: Parameters<typeof loaded.default>) => {
            const init = await loaded.default(...args);
            const dependencies =
              init.sideEffectDependencies as KeyValueStorageDependencies;
            const createKeyValueStorage = <K extends string, V>(
              props: Parameters<
                KeyValueStorageDependencies['createKeyValueStorage']
              >[0],
            ) => {
              const storage = dependencies.createKeyValueStorage<K, V>(props);
              if (props.collectionId === 'redux') {
                reduxStorage = storage as unknown as KeyValueStorage<
                  string,
                  unknown
                >;
              }
              return storage;
            };
            return {
              ...init,
              sideEffectDependencies: {
                ...init.sideEffectDependencies,
                createKeyValueStorage,
              },
            };
          },
        };
      },
    },
  };
  const readPersisted = async (key: string) =>
    reduxStorage
      ? firstValueFrom(reduxStorage.getValues([key]), {
          defaultValue: [undefined],
        }).then(([value]) => value)
      : undefined;
  return { module, readPersisted };
};

const waitFor = async (condition: () => Promise<boolean> | boolean) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Condition not met within 5 seconds');
};

it('starts Cardano with a renamed consumer module and no preloaded wallet', async () => {
  const wallet = await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      {
        ...m.blockchainCardano,
        moduleName: ModuleName('renamed-cardano'),
      } as typeof m.blockchainCardano,
      m.cardanoProviderBlockfrost,
      m.cryptoCardanoSdk,
      createPasskeyVaultModule({ keySource: {} as PasskeyKeySource }),
    ] as const,
    environment: 'development',
    featureFlags: cardanoFlags,
    config: cardanoConfig,
  });
  expect(wallet.getState().wallets?.ids).toEqual([]);
  expect(wallet.stateObservables.addresses?.selectAllAddresses$).toBeDefined();
  expect(wallet.stateObservables.tokens?.selectAllTokens$).toBeDefined();
  expect(
    wallet.stateObservables.cardanoContext?.selectAvailableAccountUtxos$,
  ).toBeDefined();
});

it('leaves Cardano app contracts and sync inactive without Cardano flag', async () => {
  const wallet = await createLaceWallet({
    modules: [m.featureDev, m.storageInMemory] as const,
    environment: 'development',
    featureFlags: [],
    config: { defaultFeatureFlags: [], extraFeatureFlags: [] },
  });
  expect(wallet.getState().wallets?.ids).toEqual([]);
  expect(wallet.getState().cardanoContext).toBeUndefined();
  expect(sdkCardanoAppModule.feature?.willLoad([], 'development')).toBe(false);
});

it('loads Cardano app contracts with the Bitcoin flag', () => {
  expect(
    sdkCardanoAppModule.feature?.willLoad(
      [{ key: BITCOIN_FEATURE_FLAG }],
      'development',
    ),
  ).toBe(true);
});

it('persists the analytics user id it mints, and no analytics event or id leaves the SDK', async () => {
  // Offline: the chain provider's requests fail fast instead of reaching
  // the network.
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('offline'));
  analyticsProvider.calls.length = 0;
  analyticsProvider.results.length = 0;
  const storage = createInspectableStorage();
  try {
    const wallet = await createLaceWallet({
      modules: [
        m.featureDev,
        storage.module,
        m.blockchainCardano,
        m.cardanoProviderBlockfrost,
        m.cryptoCardanoSdk,
        createPasskeyVaultModule({ keySource: {} as PasskeyKeySource }),
      ] as const,
      environment: 'development',
      featureFlags: cardanoFlags,
      config: cardanoConfig,
    });

    // The analytics store is the base module's, outside the consumer
    // modules' typed state.
    const userId = () =>
      (
        wallet.getState() as {
          analytics?: { analytics?: { user?: { id: string } } };
        }
      ).analytics?.analytics?.user?.id;
    await waitFor(() => userId() !== undefined);
    const id = userId()!;
    expect(id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
    await waitFor(async () =>
      String(await storage.readPersisted('persist:analytics')).includes(id),
    );
    expect(analyticsProvider.calls).toEqual([]);

    // A failure is reported to analytics; the event reaches the SDK's
    // provider under the minted id and goes no further.
    const dispatch = wallet.dispatch as unknown as (
      key: string,
      ...args: unknown[]
    ) => void;
    dispatch('failures.addFailure', {
      failureId: FailureId('cardano-sync-startup-test'),
      message: 'sync.error.cardano-sync-round-failed',
    });
    await waitFor(() => analyticsProvider.calls.length > 0);
    expect(analyticsProvider.calls).toHaveLength(1);
    const [[event, context]] = analyticsProvider.calls;
    expect(event.eventName).toBe('failure | tracked');
    expect(context.user.id).toBe(id);
    const [result] = analyticsProvider.results;
    expect(isObservable(result)).toBe(true);
    await expect(
      firstValueFrom(
        result as ReturnType<AnalyticsProvider['trackAnalyticsEvent']>,
      ),
    ).resolves.toBeUndefined();
    // The only requests are the chain provider's; none carries the id or
    // the event.
    for (const [input, init] of fetchSpy.mock.calls) {
      const url = input instanceof Request ? input.url : String(input);
      expect(
        url.startsWith(
          cardanoConfig.cardanoProvider.blockfrostConfigs[1].clientConfig
            .baseUrl,
        ),
      ).toBe(true);
      const request = `${url} ${JSON.stringify(init ?? {})}`;
      expect(request).not.toContain(id);
      expect(request).not.toContain('failure | tracked');
    }
  } finally {
    fetchSpy.mockRestore();
  }
});

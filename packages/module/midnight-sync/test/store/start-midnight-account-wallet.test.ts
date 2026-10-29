import {
  DEFAULT_NETWORKS_CONFIG,
  MidnightSDKNetworkIds,
  SerialisedWalletState,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import * as LaceSdkUtil from '@lace-lib/util';
import { configureWasmProver } from '@lace-lib/vendor/wasm-proof-backend';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import * as WalletSdk from '@midnightntwrk/wallet-sdk';
import * as WalletSdkDustWallet from '@midnightntwrk/wallet-sdk/dust';
import * as WalletSdkShielded from '@midnightntwrk/wallet-sdk/shielded';
import * as WalletSdkUnshielded from '@midnightntwrk/wallet-sdk/unshielded';
import noop from 'lodash/noop';
import {
  BehaviorSubject,
  defer,
  EMPTY,
  firstValueFrom,
  ignoreElements,
  lastValueFrom,
  mergeMap,
  of,
  Subject,
  take,
  tap,
  throwError,
} from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMidnightSideEffectDependencies } from '../../src/store/dependencies';
import { initializeMidnightSideEffectDependencies } from '../../src/store/initialize-dependencies';
import { createSdkStoreInit } from '../../src/store/sdk-init';
import * as accountKeyManager from '../../src/store/side-effects/account-key-manager';
import { watchMidnightAccount } from '../../src/store/side-effects/watch';

import type { CreateAttestedProver } from '../../src/store/dependencies';
import type {
  AccountKeyManager,
  AccountKeys,
  MidnightAccountProps,
  MidnightNetworkConfig,
  MidnightWallet,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { ModuleInitProps } from '@lace-contract/module';
import type { CollectionStorage } from '@lace-contract/storage';
import type { InMemoryWalletAccount } from '@lace-contract/wallet-repo';
import type * as WalletSdkFacade from '@midnightntwrk/wallet-sdk/facade';

// ===== MOCKS =====

vi.mock('@cardano-sdk/key-management', () => ({
  emip3decrypt: vi.fn(),
  emip3encrypt: vi.fn(),
}));

vi.mock('@midnightntwrk/wallet-sdk-address-format', () => ({
  DustAddress: {
    codec: {
      encode: vi.fn().mockReturnValue({ asString: () => 'dust-address' }),
    },
  },
  ShieldedAddress: {
    codec: {
      encode: vi.fn().mockReturnValue({ asString: () => 'shielded-address' }),
    },
  },
  UnshieldedAddress: {
    codec: {
      encode: vi.fn().mockReturnValue({ asString: () => 'unshielded-address' }),
    },
  },
}));

vi.mock('@lace-lib/util', async () => {
  const actual = await vi.importActual<typeof LaceSdkUtil>('@lace-lib/util');
  return {
    __esModule: true,
    ...actual,
    ByteArray: Object.assign(
      vi.fn((value: Uint8Array) =>
        Object.assign(actual.ByteArray(value), { fill: noop }),
      ),
      {
        ...actual.ByteArray,
        toUTF8: vi.fn(actual.ByteArray.toUTF8),
        fromUTF8: vi.fn(actual.ByteArray.fromUTF8),
        fromHex: vi.fn(actual.ByteArray.fromHex),
      },
    ),
    HexBytes: Object.assign(vi.fn(actual.HexBytes), {
      ...actual.HexBytes,
      fromByteArray: vi.fn(actual.HexBytes.fromByteArray),
    }),
  };
});

vi.mock('@midnightntwrk/wallet-sdk', () => ({
  InMemoryTransactionHistoryStorage: Object.assign(vi.fn(), {
    restore: vi.fn(),
  }),
  mergeWalletEntries: vi.fn(),
  WalletEntrySchema: {},
}));

vi.mock('@midnightntwrk/wallet-sdk/dust', () => ({
  DustWallet: vi.fn(),
}));

const { WalletFacadeInitMock } = vi.hoisted(() => ({
  WalletFacadeInitMock: vi.fn(),
}));
vi.mock('@midnightntwrk/wallet-sdk/facade', () => ({
  WalletFacade: { init: WalletFacadeInitMock },
}));

vi.mock('@midnightntwrk/wallet-sdk/shielded', async importOriginal => {
  const actual = await importOriginal<typeof WalletSdkShielded>();
  return {
    ...actual,
    ShieldedWallet: vi.fn(),
  };
});

vi.mock('@midnightntwrk/wallet-sdk/unshielded', () => ({
  PublicKey: { fromKeyStore: vi.fn() },
  UnshieldedWallet: vi.fn(),
  createKeystore: vi.fn().mockReturnValue({
    getPublicKey: vi.fn(),
    signData: vi.fn(),
  }),
}));

const { zswapSecretKeysMock, dustSecretKeyMock } = vi.hoisted(() => ({
  zswapSecretKeysMock: { clear: vi.fn() },
  // Needs clear(): the sync copies are zeroized on teardown, so a bare string
  // here throws in the facade-stop finally() as an unhandled rejection.
  dustSecretKeyMock: { clear: vi.fn() },
}));
vi.mock('@midnight-ntwrk/ledger-v8', () => ({
  createProvingPayload: vi.fn((preimage: Uint8Array) => preimage),
  createCheckPayload: vi.fn((preimage: Uint8Array) => preimage),
  parseCheckResult: vi.fn(() => []),
  DustSecretKey: { fromSeed: vi.fn().mockReturnValue(dustSecretKeyMock) },
  ZswapSecretKeys: {
    fromSeed: vi.fn().mockReturnValue(zswapSecretKeysMock),
  },
  LedgerParameters: {
    initialParameters: vi.fn().mockReturnValue({ dust: {} }),
  },
}));

// ===== TEST HELPERS =====

/**
 * The keys pipeline yields through observeOn(asyncScheduler) before wallet
 * start (LW-15215), so settling lifecycle work needs several macrotask hops,
 * not one.
 */
const flushScheduledWork = async (hops = 5): Promise<void> => {
  for (let hop = 0; hop < hops; hop += 1) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

const createMockFacadeState = () => ({
  dust: {
    capabilities: { keys: { getAddress: () => 'dust-address' } },
    state: {
      progress: {
        isStrictlyComplete: () => true,
        appliedIndex: 100n,
        highestIndex: 100n,
        highestRelevantWalletIndex: 100n,
        highestRelevantIndex: 100n,
        isConnected: true,
      },
    },
    balance: () => 0n,
  },
  shielded: {
    address: 'shielded-address',
    state: {
      progress: {
        isStrictlyComplete: () => true,
        appliedIndex: 100n,
        highestIndex: 100n,
        highestRelevantWalletIndex: 100n,
        highestRelevantIndex: 100n,
        isConnected: true,
      },
    },
    totalCoins: [],
  },
  unshielded: {
    address: 'unshielded-address',
    capabilities: { keys: { getPublicKey: () => 'night-verifying-key' } },
    state: {
      progress: {
        isStrictlyComplete: () => true,
        appliedId: 100n,
        highestTransactionId: 100n,
        isConnected: true,
      },
    },
    availableCoins: [],
    pendingCoins: [],
  },
});

const createMockKeyManager = (
  overrides: Partial<AccountKeyManager> = {},
): AccountKeyManager => ({
  keys$: EMPTY,
  areKeysAvailable$: of(false),
  destroy: vi.fn(),
  ...overrides,
});

const createMockAccountKeys = (): AccountKeys => {
  // Must be 32 bytes for ledger validation
  const dustKeyBuffer = LaceSdkUtil.ByteArray(new Uint8Array(32).fill(1));
  const zswapKeyBuffer = LaceSdkUtil.ByteArray(new Uint8Array(32).fill(2));
  // Pre-compute ledger key objects (matching real implementation)
  const dustSecretKey = ledger.DustSecretKey.fromSeed(dustKeyBuffer);
  const zswapSecretKeys = ledger.ZswapSecretKeys.fromSeed(zswapKeyBuffer);

  return {
    unshieldedKeystore: {
      getPublicKey: vi.fn(),
      signData: vi.fn(),
    } as unknown as AccountKeys['unshieldedKeystore'],
    walletKeys: {
      dustKeyBuffer,
      zswapKeyBuffer,
      dustSecretKey,
      zswapSecretKeys,
    },
    clear: vi.fn(),
  };
};

const createSerializedState = () => ({
  dust: SerialisedWalletState(LaceSdkUtil.HexBytes.fromUTF8('dust-state')),
  shielded: SerialisedWalletState(
    LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
  ),
  unshielded: SerialisedWalletState(
    LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
  ),
  txHistory: SerialisedWalletState(LaceSdkUtil.HexBytes.fromUTF8('tx-history')),
});

// ===== SHARED MOCKS =====

const unshieldedWalletMock = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  serializeState: vi.fn().mockResolvedValue('unshielded-state'),
  balanceFinalizedTransaction: vi.fn(),
  balanceUnboundTransaction: vi.fn(),
  initSwap: vi.fn(),
  transferTransaction: vi.fn(),
  revertTransaction: vi.fn(),
};

const shieldedWalletMock = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  serializeState: vi.fn().mockResolvedValue('shielded-state'),
  balanceTransaction: vi.fn(),
  initSwap: vi.fn(),
  transferTransaction: vi.fn(),
  revertTransaction: vi.fn(),
};

const dustWalletMock = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  serializeState: vi.fn().mockResolvedValue('dust-state'),
  balanceTransactions: vi.fn(),
};

const walletFacadeMock = {
  state: vi.fn().mockReturnValue(of(createMockFacadeState())),
  stop: vi.fn().mockResolvedValue(undefined),
  dust: dustWalletMock,
  shielded: shieldedWalletMock,
  unshielded: unshieldedWalletMock,
  registerNightUtxosForDustGeneration: vi.fn(),
  signTransaction: vi.fn(),
  submitTransaction: vi.fn(),
  balanceTransaction: vi.fn(),
  balanceFinalizedTransaction: vi.fn().mockResolvedValue('balanced-finalized'),
  balanceUnboundTransaction: vi.fn().mockResolvedValue('balanced-unbound'),
  balanceUnprovenTransaction: vi.fn().mockResolvedValue('balanced-unproven'),
  finalizeTransaction: vi.fn(),
  transferTransaction: vi.fn(),
  calculateTransactionFee: vi.fn(),
  estimateTransactionFee: vi.fn(),
  initSwap: vi.fn(),
  deregisterFromDustGeneration: vi.fn(),
  revert: vi.fn().mockResolvedValue(undefined),
};

WalletFacadeInitMock.mockReturnValue(
  walletFacadeMock as unknown as WalletSdkFacade.WalletFacade,
);

vi.mocked(WalletSdkDustWallet.DustWallet).mockReturnValue({
  restore: vi.fn().mockReturnValue('restored-dust'),
  startWithSeed: vi.fn().mockReturnValue('new-dust'),
} as unknown as WalletSdkDustWallet.DustWalletClass);

vi.mocked(WalletSdkShielded.ShieldedWallet).mockReturnValue({
  restore: vi.fn().mockReturnValue('restored-shielded'),
  startWithSeed: vi.fn().mockReturnValue('new-shielded'),
} as unknown as ReturnType<typeof WalletSdkShielded.ShieldedWallet>);

vi.mocked(WalletSdkUnshielded.UnshieldedWallet).mockReturnValue({
  restore: vi.fn().mockReturnValue('restored-unshielded'),
  startWithPublicKey: vi.fn().mockReturnValue('new-unshielded'),
} as unknown as WalletSdkUnshielded.UnshieldedWalletClass);

const txHistoryStorageMock = {
  serialize: vi.fn().mockResolvedValue('tx-history'),
} as unknown as WalletSdk.InMemoryTransactionHistoryStorage;

vi.mocked(WalletSdk.InMemoryTransactionHistoryStorage).mockImplementation(
  // eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions -- invoked with `new`, which an arrow function cannot be
  function () {
    return txHistoryStorageMock;
  },
);
vi.mocked(WalletSdk.InMemoryTransactionHistoryStorage.restore).mockReturnValue(
  txHistoryStorageMock,
);

// ===== TESTS =====

const { midnightAccount } = stubData;

const config: MidnightNetworkConfig = {
  indexerAddress: 'http://indexer.test',
  proofServer: { kind: 'local-host', url: 'http://proof.test' },
  nodeAddress: 'http://node.test',
};

const midnightSideEffectDependencies = initializeMidnightSideEffectDependencies(
  { runtime: {} } as Readonly<ModuleInitProps>,
  { logger: dummyLogger },
);

describe('startMidnightAccountWallet', () => {
  let store: CollectionStorage<SerializedMidnightWallet>;

  beforeEach(() => {
    store = {
      getAll: vi.fn().mockReturnValue(of([])),
      // Derived from getAll so a test states its stored state once, the way the
      // real store does: one document, looked up by its computed id.
      get: vi.fn((docId: string) =>
        store.getAll().pipe(
          // One read, one answer, then complete — the real store never stays
          // open on its source the way a hot getAll() subject would.
          take(1),
          mergeMap(states => {
            const found = states.find(s => String(s.accountId) === docId);
            return found ? of(found) : EMPTY;
          }),
        ),
      ),
      setAll: vi.fn().mockReturnValue(EMPTY),
      observeAll: vi.fn(),
      upsert: vi.fn().mockReturnValue(of(void 0)),
      removeWhere: vi.fn().mockReturnValue(of(void 0)),
      clear: vi.fn().mockReturnValue(of(void 0)),
    };
    vi.clearAllMocks();
    walletFacadeMock.state.mockReturnValue(of(createMockFacadeState()));
  });

  describe('batch updates', () => {
    const batchUpdatesPassedToFacade = async (
      dependencies: typeof midnightSideEffectDependencies,
    ) => {
      await firstValueFrom(
        dependencies.startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager: createMockKeyManager({
            keys$: of(createMockAccountKeys()),
          }),
        }),
      );
      const [{ configuration }] = WalletFacadeInitMock.mock.calls[0] as [
        { configuration: { batchUpdates: { size: number; spacing: number } } },
      ];
      return configuration.batchUpdates;
    };

    it('applies 12 events per chunk 4ms apart by default', async () => {
      expect(
        await batchUpdatesPassedToFacade(midnightSideEffectDependencies),
      ).toEqual({ size: 12, spacing: 4 });
    });

    it('applies the configured batch tuning', async () => {
      expect(
        await batchUpdatesPassedToFacade(
          createMidnightSideEffectDependencies({
            batchUpdates: { size: 64, spacing: 0 },
          })({ runtime: {} } as Readonly<ModuleInitProps>, {
            logger: dummyLogger,
          }),
        ),
      ).toEqual({ size: 64, spacing: 0 });
    });
  });

  describe('wallet creation', () => {
    it('emits MidnightWallet for restored wallet and requests keys for dust wallet', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const keysRequested = vi.fn();
      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()).pipe(tap(keysRequested)),
      });

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      const wallet = await firstValueFrom(result$);

      expect(wallet.accountId).toBe(midnightAccount.accountId);
      expect(wallet.walletId).toBe(midnightAccount.walletId);
      expect(keysRequested).toHaveBeenCalled();
    });

    it('requests keys for new wallet', async () => {
      const keysRequested = vi.fn();
      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()).pipe(tap(keysRequested)),
      });

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      const wallet = await firstValueFrom(result$);

      expect(wallet.accountId).toBe(midnightAccount.accountId);
      expect(keysRequested).toHaveBeenCalled();
    });

    it('wires the wallet to the tx-history storage it persists (LW-15122)', async () => {
      const createdStorages: WalletSdk.InMemoryTransactionHistoryStorage[] = [];
      // eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions -- invoked with `new`, which an arrow function cannot be
      function makeStorageStub() {
        const stub = {
          serialize: vi.fn().mockReturnValue('[]'),
        } as unknown as WalletSdk.InMemoryTransactionHistoryStorage;
        createdStorages.push(stub);
        return stub;
      }
      vi.mocked(WalletSdk.InMemoryTransactionHistoryStorage)
        .mockImplementationOnce(makeStorageStub) // config-literal default
        .mockImplementationOnce(makeStorageStub); // fresh-path instance

      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()),
      });

      await firstValueFrom(
        midnightSideEffectDependencies.startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        }),
      );

      const initArgument = WalletFacadeInitMock.mock.calls[0]?.[0] as {
        configuration: {
          txHistoryStorage: WalletSdk.InMemoryTransactionHistoryStorage;
        };
      };
      expect(createdStorages).toHaveLength(2);
      expect(initArgument.configuration.txHistoryStorage).toBe(
        createdStorages[1],
      );
      expect(initArgument.configuration.txHistoryStorage).not.toBe(
        createdStorages[0],
      );
    });

    it.each([
      { kind: 'local-host', url: 'http://localhost:6300' },
      { kind: 'in-process' },
    ] as const)(
      'injects the $kind service without a fallback server URL',
      async proofServer => {
        configureWasmProver(() => ({
          check: async () => [],
          prove: async () => new Uint8Array(),
        }));
        const keyManager = createMockKeyManager({
          keys$: of(createMockAccountKeys()),
        });

        await firstValueFrom(
          midnightSideEffectDependencies.startMidnightAccountWallet({
            account:
              midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
            config: { ...config, proofServer },
            store,
            keyManager,
          }),
        );

        const initArgument = WalletFacadeInitMock.mock.calls[0]?.[0] as {
          configuration: Record<string, unknown>;
          provingService?: () => unknown;
        };
        expect(initArgument.provingService).toBeTypeOf('function');
        expect(initArgument.configuration).not.toHaveProperty(
          'provingServerUrl',
        );
      },
    );

    describe('on a tee-delegated proof server', () => {
      const createMockAttestedProver: CreateAttestedProver = () => ({
        id: 'test',
        phases: [],
        operations: ['prove'],
        establishAttestedSession: async () => {
          throw new Error('Unexpected proving during wallet startup');
        },
      });
      const teeConfig: MidnightNetworkConfig = {
        ...config,
        proofServer: {
          kind: 'tee-delegated',
          url: 'https://tee.test',
          label: 'TEE',
        },
      };
      const start = async (
        dependencies: ReturnType<
          ReturnType<typeof createMidnightSideEffectDependencies>
        >,
      ) =>
        firstValueFrom(
          dependencies.startMidnightAccountWallet({
            account:
              midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
            config: teeConfig,
            store,
            keyManager: createMockKeyManager({
              keys$: of(createMockAccountKeys()),
            }),
          }),
        );

      it.each([MidnightSDKNetworkIds.MainNet, MidnightSDKNetworkIds.Preview])(
        'wires the preprod ledger indexer into the attested prover when watching a %s wallet',
        async networkId => {
          const preprodIndexerUrl =
            'https://ledger.example/preprod/graphql?apiKey=preprod';
          const networksConfig = {
            ...DEFAULT_NETWORKS_CONFIG,
            preprod: {
              ...DEFAULT_NETWORKS_CONFIG.preprod,
              indexerAddress: preprodIndexerUrl,
            },
            [networkId]: {
              ...teeConfig,
              indexerAddress: `https://wallet.example/${networkId}/graphql`,
            },
          };
          const account = {
            ...midnightAccount,
            blockchainSpecific: {
              ...midnightAccount.blockchainSpecific,
              networkId,
            },
          } as unknown as InMemoryWalletAccount<MidnightAccountProps>;
          const createAttestedProver = vi.fn(createMockAttestedProver);
          const dependencies = createMidnightSideEffectDependencies({
            createAttestedProver,
          })({ runtime: {} } as Readonly<ModuleInitProps>, {
            logger: dummyLogger,
          });
          const keyManagerSpy = vi
            .spyOn(accountKeyManager, 'createAccountKeyManager')
            .mockReturnValue(
              createMockKeyManager({ keys$: of(createMockAccountKeys()) }),
            );
          const watch = watchMidnightAccount(
            account,
            networksConfig[networkId],
            store,
          );
          const startMidnightAccountWallet = vi.fn(
            (
              options: Parameters<
                typeof dependencies.startMidnightAccountWallet
              >[0],
            ) =>
              dependencies.startMidnightAccountWallet(options).pipe(
                take(1),
                mergeMap(wallet => wallet.stop().pipe(ignoreElements())),
              ),
          );
          try {
            await lastValueFrom(
              watch(
                {} as Parameters<typeof watch>[0],
                {
                  midnightContext: {
                    selectNetworksConfig$: of(networksConfig),
                  },
                } as Parameters<typeof watch>[1],
                {
                  ...dependencies,
                  runtime: {},
                  startMidnightAccountWallet,
                } as unknown as Parameters<typeof watch>[2],
              ),
              { defaultValue: undefined },
            );
            expect(startMidnightAccountWallet).toHaveBeenCalledOnce();
            expect(WalletFacadeInitMock).toHaveBeenCalledOnce();
            expect(createAttestedProver).toHaveBeenCalledOnce();
            const options = createAttestedProver.mock.calls[0][0];
            expect(options).toMatchObject({
              networkId,
              proofServerApiUrl: 'https://tee.test',
            });
            await expect(options.getLedgerIndexerUrl()).resolves.toBe(
              preprodIndexerUrl,
            );
          } finally {
            keyManagerSpy.mockRestore();
          }
        },
      );

      it('starts when the loadout supplies an attested prover', async () => {
        const createAttestedProver = vi.fn(createMockAttestedProver);
        const dependencies = createMidnightSideEffectDependencies({
          createAttestedProver,
        })({ runtime: {} } as Readonly<ModuleInitProps>, {
          logger: dummyLogger,
        });

        const wallet = await start(dependencies);

        expect(wallet.accountId).toBe(midnightAccount.accountId);
      });

      it('serves SDK circuits through the injected session and closes after success and failure', async () => {
        const prove = vi.fn().mockResolvedValue(new Uint8Array([7]));
        const close = vi.fn().mockResolvedValue(undefined);
        const createAttestedProver = vi.fn(() => ({
          id: 'sdk-test',
          phases: [],
          operations: ['prove' as const],
          establishAttestedSession: async () => ({ prove, close }),
        }));
        const loaded = await createSdkStoreInit({
          auth: { authenticate: () => of(true), accessAuthSecret: vi.fn() },
          createAttestedProver,
        })(
          {
            runtime: { config: { defaultMidnightTestnetNetworkId: 'preview' } },
          } as ModuleInitProps,
          { logger: dummyLogger },
        );
        const wallet = await start(
          loaded.sideEffectDependencies as ReturnType<
            ReturnType<typeof createMidnightSideEffectDependencies>
          >,
        );
        expect(createAttestedProver).toHaveBeenCalledWith({
          networkId: midnightAccount.blockchainSpecific.networkId,
          proofServerApiUrl:
            teeConfig.proofServer.kind === 'tee-delegated'
              ? teeConfig.proofServer.url
              : '',
          getLedgerIndexerUrl: expect.any(Function) as unknown,
        });
        await expect(
          wallet.proofCircuitProvider.prove({
            serializedPreimage: new Uint8Array([1]),
            keyLocation: 'midnight/test',
          }),
        ).resolves.toEqual(new Uint8Array([7]));
        prove.mockRejectedValueOnce(new Error('channel failed'));
        await expect(
          wallet.proofCircuitProvider.prove({
            serializedPreimage: new Uint8Array([2]),
            keyLocation: 'midnight/test',
          }),
        ).rejects.toThrow('channel failed');
        expect(close).toHaveBeenCalledTimes(2);
        await expect(
          wallet.proofCircuitProvider.check({
            serializedPreimage: new Uint8Array([3]),
            keyLocation: 'midnight/test',
          }),
        ).rejects.toThrow('not available');
        expect(prove).toHaveBeenCalledTimes(2);
        await firstValueFrom(wallet.stop());
      });

      it('refuses a recognized TEE host disguised as delegated HTTP at engine startup', async () => {
        const dependencies = createMidnightSideEffectDependencies({
          createAttestedProver: vi.fn(),
        })({ runtime: {} } as ModuleInitProps, { logger: dummyLogger });
        await expect(
          firstValueFrom(
            dependencies.startMidnightAccountWallet({
              account:
                midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
              config: {
                ...config,
                proofServer: {
                  kind: 'delegated',
                  url: 'https://api.proofserver.wastedp.io/',
                  label: 'ordinary',
                },
              },
              store,
              keyManager: createMockKeyManager({
                keys$: of(createMockAccountKeys()),
              }),
            }),
          ),
        ).rejects.toThrow('select tee-delegated');
        expect(WalletFacadeInitMock).not.toHaveBeenCalled();
      });

      it("proves through the Temenos prover in the app's own dependencies", async () => {
        // The Temenos prover only attests its baked deployments, so the test
        // server reaching its check shows the app supplies it.
        await expect(start(midnightSideEffectDependencies)).rejects.toThrow(
          'No baked Temenos attestation config',
        );
      });

      it('does not start without an attested prover', async () => {
        const dependencies = createMidnightSideEffectDependencies()(
          { runtime: {} } as Readonly<ModuleInitProps>,
          { logger: dummyLogger },
        );

        await expect(start(dependencies)).rejects.toThrow(
          'proof server mode "tee-delegated" needs an attested prover',
        );
        expect(WalletFacadeInitMock).not.toHaveBeenCalled();
      });
    });

    it('discards unreadable persisted state and rebuilds from seed', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );
      vi.mocked(
        WalletSdk.InMemoryTransactionHistoryStorage.restore,
      ).mockImplementationOnce(() => {
        throw new Error('Failed to decode transaction history');
      });

      const keysRequested = vi.fn();
      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()).pipe(tap(keysRequested)),
      });

      const wallet = await firstValueFrom(
        midnightSideEffectDependencies.startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        }),
      );

      expect(store.removeWhere).toHaveBeenCalledTimes(1);
      expect(wallet.accountId).toBe(midnightAccount.accountId);
      expect(keysRequested).toHaveBeenCalled();
    });

    it('discards only the corrupt account and preserves healthy siblings', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      const healthyEntry = {
        walletId: midnightAccount.walletId,
        accountId: `${midnightAccount.accountId}-sibling`,
        serializedState: createSerializedState(),
        networkId,
      } as unknown as SerializedMidnightWallet;
      const corruptEntry = {
        walletId: midnightAccount.walletId,
        accountId: midnightAccount.accountId,
        serializedState: createSerializedState(),
        networkId,
      } as unknown as SerializedMidnightWallet;
      vi.mocked(store.getAll).mockReturnValue(of([healthyEntry, corruptEntry]));
      vi.mocked(
        WalletSdk.InMemoryTransactionHistoryStorage.restore,
      ).mockImplementationOnce(() => {
        throw new Error('Failed to decode transaction history');
      });

      const wallet = await firstValueFrom(
        midnightSideEffectDependencies.startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager: createMockKeyManager({
            keys$: of(createMockAccountKeys()),
          }),
        }),
      );

      // removeWhere names the documents it deletes, so the sibling's entry is
      // out of reach by construction rather than by careful filtering.
      expect(store.removeWhere).toHaveBeenCalledTimes(1);
      const predicate = vi.mocked(store.removeWhere).mock.calls[0][0];
      expect(predicate(corruptEntry)).toBe(true);
      expect(predicate(healthyEntry)).toBe(false);
      expect(wallet.accountId).toBe(midnightAccount.accountId);
    });
  });

  describe('wallet lifecycle', () => {
    it('starts unshielded wallet immediately and defers shielded and dust wallets until keys are available', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const keyManager = createMockKeyManager();

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      await firstValueFrom(result$);

      expect(unshieldedWalletMock.start).toHaveBeenCalled();
      expect(shieldedWalletMock.start).not.toHaveBeenCalled();
      expect(dustWalletMock.start).not.toHaveBeenCalled();
    });

    it('starts shielded wallet with sync keys derived from the account zswap seed, then dust wallet', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const accountKeys = createMockAccountKeys();
      const keyManager = createMockKeyManager({ keys$: of(accountKeys) });

      // createMockAccountKeys() derives via the same mocked fromSeed, so reset
      // the spies here — otherwise the assertions below are satisfied by the
      // helper and pass even if production never derives its own keys.
      vi.mocked(ledger.ZswapSecretKeys.fromSeed).mockClear();
      vi.mocked(ledger.DustSecretKey.fromSeed).mockClear();

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      await firstValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Both streams must derive their OWN key from the seed buffer. Passing
      // the cached object instead is invisible to the start() assertions below
      // (the mocked fromSeed returns the same instance), so assert the
      // derivation itself: without it, clear() zeroizing the cached copy on
      // idle would wedge the running stream.
      expect(ledger.ZswapSecretKeys.fromSeed).toHaveBeenCalledWith(
        accountKeys.walletKeys.zswapKeyBuffer,
      );
      expect(ledger.DustSecretKey.fromSeed).toHaveBeenCalledWith(
        accountKeys.walletKeys.dustKeyBuffer,
      );
      expect(shieldedWalletMock.start).toHaveBeenCalledWith(
        zswapSecretKeysMock,
      );
      expect(dustWalletMock.start).toHaveBeenCalledWith(
        accountKeys.walletKeys.dustSecretKey,
      );
    });

    it('starts dust even when the shielded start fails, and surfaces the failure', async () => {
      // Chaining dust off shielded's promise skipped it entirely on failure:
      // dust/cNIGHT balances stopped updating for the session, logged only.
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const startError = new Error('shielded start failed');
      shieldedWalletMock.start.mockRejectedValueOnce(startError);

      const accountKeys = createMockAccountKeys();
      const errors: unknown[] = [];

      const subscription = midnightSideEffectDependencies
        .startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager: createMockKeyManager({ keys$: of(accountKeys) }),
        })
        .subscribe({
          error: (error: unknown) => errors.push(error),
        });
      await flushScheduledWork();

      try {
        expect(dustWalletMock.start).toHaveBeenCalledWith(
          accountKeys.walletKeys.dustSecretKey,
        );
        // Raised rather than swallowed, so the account watch can retry it and
        // eventually show the user a failure (ADR 15).
        expect(errors).toEqual([startError]);
      } finally {
        subscription.unsubscribe();
      }
    });

    it('surfaces a dust start failure even though shielded succeeded', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const dustError = new Error('dust start failed');
      dustWalletMock.start.mockRejectedValueOnce(dustError);

      const errors: unknown[] = [];
      const subscription = midnightSideEffectDependencies
        .startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager: createMockKeyManager({
            keys$: of(createMockAccountKeys()),
          }),
        })
        .subscribe({ error: (error: unknown) => errors.push(error) });
      await flushScheduledWork();

      try {
        expect(errors).toEqual([dustError]);
      } finally {
        subscription.unsubscribe();
      }
    });

    it('raises the first failure and logs both when neither wallet starts', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const shieldedError = new Error('shielded start failed');
      const dustError = new Error('dust start failed');
      shieldedWalletMock.start.mockRejectedValueOnce(shieldedError);
      dustWalletMock.start.mockRejectedValueOnce(dustError);
      const errorLog = vi.spyOn(dummyLogger, 'error');

      const errors: unknown[] = [];
      const subscription = midnightSideEffectDependencies
        .startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager: createMockKeyManager({
            keys$: of(createMockAccountKeys()),
          }),
        })
        .subscribe({ error: (error: unknown) => errors.push(error) });
      await flushScheduledWork();

      try {
        expect(errors).toEqual([shieldedError]);
        // The dust failure would otherwise vanish: only the first is raised.
        expect(errorLog).toHaveBeenCalledWith(
          expect.stringContaining('dust wallet failed to start'),
          dustError,
        );
      } finally {
        errorLog.mockRestore();
        subscription.unsubscribe();
      }
    });

    it('starts dust wallet immediately by requesting keys', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()),
      });

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      await firstValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dustWalletMock.start).toHaveBeenCalled();
    });

    it('does not stop DustWallet when keys become unavailable (SDK limitation)', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const areKeysAvailable$ = new BehaviorSubject(true);
      const keyManager = createMockKeyManager({
        areKeysAvailable$,
        keys$: of(createMockAccountKeys()),
      });

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      await firstValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dustWalletMock.start).toHaveBeenCalledTimes(1);
      dustWalletMock.stop.mockClear();

      areKeysAvailable$.next(false);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dustWalletMock.stop).not.toHaveBeenCalled();
    });

    it('starts dust wallet after auth retry when initial auth is cancelled', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      let isAuthCancelled = true;
      const areKeysAvailable$ = new BehaviorSubject(false);
      const keyManager = createMockKeyManager({
        areKeysAvailable$,
        keys$: defer(() =>
          isAuthCancelled
            ? throwError(() => new AuthenticationCancelledError())
            : of(createMockAccountKeys()),
        ),
      });

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      const subscription = result$.subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dustWalletMock.start).not.toHaveBeenCalled();

      isAuthCancelled = false;
      areKeysAvailable$.next(true);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(dustWalletMock.start).toHaveBeenCalled();
      subscription.unsubscribe();
    });

    it('stops the facade without starting any wallet when unsubscribed during async init', async () => {
      const getAll$ = new Subject<SerializedMidnightWallet[]>();
      vi.mocked(store.getAll).mockReturnValue(getAll$);

      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()),
      });

      const subscription = midnightSideEffectDependencies
        .startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        })
        .subscribe();
      subscription.unsubscribe();

      getAll$.next([]);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(walletFacadeMock.stop).toHaveBeenCalled();
      expect(unshieldedWalletMock.start).not.toHaveBeenCalled();
    });

    it('stops wallet facade on unsubscribe and clears the derived sync keys after stop resolves', async () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );

      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()),
      });

      const result$ = midnightSideEffectDependencies.startMidnightAccountWallet(
        {
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        },
      );

      const subscription = result$.subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      subscription.unsubscribe();

      expect(walletFacadeMock.stop).toHaveBeenCalled();
      expect(zswapSecretKeysMock.clear).not.toHaveBeenCalled();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(zswapSecretKeysMock.clear).toHaveBeenCalled();
    });

    const startWalletWithDrivableState = () => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState: createSerializedState(),
            networkId,
          },
        ]),
      );
      // Every serialisation must differ, or distinctUntilChanged would drop the
      // post-stop emission and these tests would pass without the fix.
      let serialisation = 0;
      dustWalletMock.serializeState.mockImplementation(async () =>
        Promise.resolve(`dust-state-${serialisation++}`),
      );
      const facadeState$ = new Subject<
        ReturnType<typeof createMockFacadeState>
      >();
      walletFacadeMock.state.mockReturnValue(facadeState$);

      let wallet: MidnightWallet | undefined;
      const subscription = midnightSideEffectDependencies
        .startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager: createMockKeyManager(),
        })
        .subscribe(emitted => {
          wallet = emitted;
        });

      return { facadeState$, subscription, getWallet: () => wallet };
    };

    const restoreSharedMocks = () => {
      vi.useRealTimers();
      dustWalletMock.serializeState.mockResolvedValue('dust-state');
      walletFacadeMock.stop.mockResolvedValue(undefined);
    };

    it('writes no further wallet state once stop() has been called', async () => {
      vi.useFakeTimers();
      try {
        const { facadeState$, subscription, getWallet } =
          startWalletWithDrivableState();

        await vi.advanceTimersByTimeAsync(0);
        facadeState$.next(createMockFacadeState());
        await vi.advanceTimersByTimeAsync(0);

        expect(store.upsert).toHaveBeenCalledTimes(1);

        await firstValueFrom(getWallet()!.stop());
        facadeState$.next(createMockFacadeState());
        // Well past the serialisation throttle, so a queued trailing emission
        // would have fired by now.
        await vi.advanceTimersByTimeAsync(60_000);

        expect(store.upsert).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
      } finally {
        restoreSharedMocks();
      }
    });

    it('stops writing at the moment stop() is called, even if the SDK never finishes stopping', async () => {
      // A hung stop() is the wedged-wallet case this control exists to rescue.
      walletFacadeMock.stop.mockReturnValue(new Promise(() => undefined));

      vi.useFakeTimers();
      try {
        const { facadeState$, subscription, getWallet } =
          startWalletWithDrivableState();

        await vi.advanceTimersByTimeAsync(0);
        facadeState$.next(createMockFacadeState());
        await vi.advanceTimersByTimeAsync(0);

        expect(store.upsert).toHaveBeenCalledTimes(1);

        getWallet()!.stop().subscribe();
        facadeState$.next(createMockFacadeState());
        await vi.advanceTimersByTimeAsync(10_000);

        expect(store.upsert).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
      } finally {
        restoreSharedMocks();
      }
    });
  });

  describe('transaction history restore and lazy key migration', () => {
    const startRestoredWallet = (
      serializedState: SerializedMidnightWallet['serializedState'],
    ) => {
      const { networkId } = midnightAccount.blockchainSpecific;
      vi.mocked(store.getAll).mockReturnValue(
        of([
          {
            walletId: midnightAccount.walletId,
            accountId: midnightAccount.accountId,
            serializedState,
            networkId,
          },
        ]),
      );

      return midnightSideEffectDependencies.startMidnightAccountWallet({
        account:
          midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
        config,
        store,
        keyManager: createMockKeyManager({
          keys$: of(createMockAccountKeys()),
        }),
      });
    };

    // The restore mock receives the decoded (UTF-8) history blob as its first
    // argument, so asserting on it proves which persisted key was read.
    const restoredHistoryBlob = () =>
      vi.mocked(WalletSdk.InMemoryTransactionHistoryStorage.restore).mock
        .calls[0][0];

    it('restores history from the current `txHistory` key', async () => {
      await firstValueFrom(
        startRestoredWallet({
          dust: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
          ),
          shielded: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
          ),
          unshielded: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
          ),
          txHistory: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('current-history'),
          ),
        }),
      );

      expect(restoredHistoryBlob()).toBe('current-history');
    });

    it('restores history from the legacy `unshieldedTxHistory` key', async () => {
      await firstValueFrom(
        startRestoredWallet({
          dust: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
          ),
          shielded: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
          ),
          unshielded: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
          ),
          unshieldedTxHistory: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('legacy-history'),
          ),
        } as unknown as SerializedMidnightWallet['serializedState']),
      );

      expect(restoredHistoryBlob()).toBe('legacy-history');
    });

    it('prefers `txHistory` over the legacy key when both are present', async () => {
      await firstValueFrom(
        startRestoredWallet({
          dust: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
          ),
          shielded: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
          ),
          unshielded: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
          ),
          txHistory: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('current-history'),
          ),
          unshieldedTxHistory: SerialisedWalletState(
            LaceSdkUtil.HexBytes.fromUTF8('legacy-history'),
          ),
        } as unknown as SerializedMidnightWallet['serializedState']),
      );

      expect(restoredHistoryBlob()).toBe('current-history');
    });

    it('re-persists a legacy profile under the `txHistory` key', async () => {
      vi.mocked(
        WalletSdk.InMemoryTransactionHistoryStorage.restore,
      ).mockReturnValueOnce({
        serialize: vi.fn().mockResolvedValue('history-serialized'),
      } as unknown as WalletSdk.InMemoryTransactionHistoryStorage);

      const subscription = startRestoredWallet({
        dust: SerialisedWalletState(
          LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
        ),
        shielded: SerialisedWalletState(
          LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
        ),
        unshielded: SerialisedWalletState(
          LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
        ),
        unshieldedTxHistory: SerialisedWalletState(
          LaceSdkUtil.HexBytes.fromUTF8('legacy-history'),
        ),
      } as unknown as SerializedMidnightWallet['serializedState']).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));

      const persistedState = vi.mocked(store.upsert).mock.calls[0]?.[0]
        ?.serializedState;
      expect(persistedState).toHaveProperty('txHistory');
      expect(persistedState).not.toHaveProperty('unshieldedTxHistory');

      subscription.unsubscribe();
    });

    // The key rename (legacy `unshieldedTxHistory`) and the encoding change
    // (legacy hex) shipped separately, so a profile can carry either, both or
    // neither. The cases above cover the key axis on hex blobs; these cover
    // verbatim values on both keys.
    it('restores a verbatim history blob under the current key unchanged', async () => {
      await firstValueFrom(
        startRestoredWallet({
          dust: SerialisedWalletState('{"dust":"state"}'),
          shielded: SerialisedWalletState('{"shielded":"state"}'),
          unshielded: SerialisedWalletState('{"unshielded":"state"}'),
          txHistory: SerialisedWalletState('{"txHistory":[]}'),
        }),
      );

      expect(restoredHistoryBlob()).toBe('{"txHistory":[]}');
    });

    it('restores a verbatim history blob under the legacy key unchanged', async () => {
      await firstValueFrom(
        startRestoredWallet({
          dust: SerialisedWalletState('{"dust":"state"}'),
          shielded: SerialisedWalletState('{"shielded":"state"}'),
          unshielded: SerialisedWalletState('{"unshielded":"state"}'),
          unshieldedTxHistory: SerialisedWalletState('{"legacy":[]}'),
        } as unknown as SerializedMidnightWallet['serializedState']),
      );

      expect(restoredHistoryBlob()).toBe('{"legacy":[]}');
    });

    it('persists serialised state verbatim rather than hex-encoded', async () => {
      const subscription = startRestoredWallet({
        dust: SerialisedWalletState('{"dust":"state"}'),
        shielded: SerialisedWalletState('{"shielded":"state"}'),
        unshielded: SerialisedWalletState('{"unshielded":"state"}'),
        txHistory: SerialisedWalletState('{"txHistory":[]}'),
      }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));

      const persistedState = vi.mocked(store.upsert).mock.calls[0]?.[0]
        ?.serializedState;
      expect(persistedState).toEqual({
        dust: SerialisedWalletState('dust-state'),
        shielded: SerialisedWalletState('shielded-state'),
        unshielded: SerialisedWalletState('unshielded-state'),
        txHistory: SerialisedWalletState('tx-history'),
      });

      subscription.unsubscribe();
    });
  });

  describe('balance method wrappers', () => {
    const startWallet = async () => {
      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()),
      });
      return firstValueFrom(
        midnightSideEffectDependencies.startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        }),
      );
    };

    const mockTx = { type: 'mock-tx' } as never;
    const ttl = new Date();

    it('balanceUnprovenTransaction passes tokenKindsToBalance to the facade', async () => {
      const wallet = await startWallet();

      await firstValueFrom(
        wallet.balanceUnprovenTransaction(mockTx, {
          ttl,
          tokenKindsToBalance: ['dust'],
        }),
      );

      expect(walletFacadeMock.balanceUnprovenTransaction).toHaveBeenCalledWith(
        mockTx,
        expect.any(Object),
        { ttl, tokenKindsToBalance: ['dust'] },
      );
    });

    it('balanceUnprovenTransaction passes ttl when tokenKindsToBalance is not provided', async () => {
      const wallet = await startWallet();

      await firstValueFrom(wallet.balanceUnprovenTransaction(mockTx, { ttl }));

      expect(walletFacadeMock.balanceUnprovenTransaction).toHaveBeenCalledWith(
        mockTx,
        expect.any(Object),
        expect.objectContaining({ ttl }),
      );
    });

    // The connector balancing steps run over the facade's sub-wallets, so
    // that a failed step releases what the earlier ones reserved.
    it('balanceFinalizedTransaction balances only the kinds it is given', async () => {
      const balancing = { merge: vi.fn() };
      shieldedWalletMock.balanceTransaction.mockResolvedValueOnce(balancing);
      const wallet = await startWallet();

      const recipe = await firstValueFrom(
        wallet.balanceFinalizedTransaction(mockTx, {
          ttl,
          tokenKindsToBalance: ['shielded'],
        }),
      );

      expect(shieldedWalletMock.balanceTransaction).toHaveBeenCalledWith(
        zswapSecretKeysMock,
        mockTx,
      );
      expect(
        unshieldedWalletMock.balanceFinalizedTransaction,
      ).not.toHaveBeenCalled();
      expect(dustWalletMock.balanceTransactions).not.toHaveBeenCalled();
      expect(recipe).toEqual({
        type: 'FINALIZED_TRANSACTION',
        originalTransaction: mockTx,
        balancingTransaction: balancing,
      });
    });

    it('balanceUnboundTransaction releases its shielded balancing, not the dApp transaction, when the fee cannot be paid', async () => {
      const shieldedBalancing = { type: 'shielded-balancing' };
      shieldedWalletMock.balanceTransaction.mockResolvedValueOnce(
        shieldedBalancing,
      );
      shieldedWalletMock.revertTransaction.mockResolvedValueOnce(undefined);
      // Adds inputs to the dApp transaction without reserving them.
      unshieldedWalletMock.balanceUnboundTransaction.mockResolvedValueOnce(
        mockTx,
      );
      dustWalletMock.balanceTransactions.mockRejectedValueOnce(
        new Error('Insufficient DUST'),
      );
      const wallet = await startWallet();

      await expect(
        firstValueFrom(wallet.balanceUnboundTransaction(mockTx, { ttl })),
      ).rejects.toThrow('Insufficient DUST');
      expect(
        shieldedWalletMock.revertTransaction,
      ).toHaveBeenCalledExactlyOnceWith(shieldedBalancing);
      expect(unshieldedWalletMock.revertTransaction).not.toHaveBeenCalled();
      expect(walletFacadeMock.balanceUnboundTransaction).not.toHaveBeenCalled();
    });

    it('transferTransaction releases its reservations when the fee cannot be paid', async () => {
      const transfer = { type: 'unshielded-transfer' };
      unshieldedWalletMock.transferTransaction.mockResolvedValueOnce(transfer);
      unshieldedWalletMock.revertTransaction.mockResolvedValueOnce(undefined);
      dustWalletMock.balanceTransactions.mockRejectedValueOnce(
        new Error('Insufficient DUST'),
      );
      const wallet = await startWallet();

      await expect(
        firstValueFrom(
          wallet.transferTransaction(
            [{ type: 'unshielded', outputs: [{}] }] as never,
            { ttl },
          ),
        ),
      ).rejects.toThrow('Insufficient DUST');
      expect(
        unshieldedWalletMock.revertTransaction,
      ).toHaveBeenCalledExactlyOnceWith(transfer);
      expect(walletFacadeMock.transferTransaction).not.toHaveBeenCalled();
    });

    it('initSwap releases its reservation when the fee cannot be paid', async () => {
      const swap = { type: 'unshielded-swap' };
      unshieldedWalletMock.initSwap.mockResolvedValueOnce(swap);
      unshieldedWalletMock.revertTransaction.mockResolvedValueOnce(undefined);
      dustWalletMock.balanceTransactions.mockRejectedValueOnce(
        new Error('Insufficient DUST'),
      );
      const wallet = await startWallet();

      await expect(
        firstValueFrom(
          wallet.initSwap({ unshielded: { aa: 1n } } as never, [], {
            ttl,
            payFees: true,
          }),
        ),
      ).rejects.toThrow('Insufficient DUST');
      expect(
        unshieldedWalletMock.revertTransaction,
      ).toHaveBeenCalledExactlyOnceWith(swap);
      expect(walletFacadeMock.initSwap).not.toHaveBeenCalled();
    });
  });

  describe('revert', () => {
    it('releases a built recipe through the facade', async () => {
      const keyManager = createMockKeyManager({
        keys$: of(createMockAccountKeys()),
      });
      const wallet = await firstValueFrom(
        midnightSideEffectDependencies.startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager,
        }),
      );
      const recipe = { type: 'UNPROVEN_TRANSACTION' } as never;

      await firstValueFrom(wallet.revert(recipe), { defaultValue: undefined });

      expect(walletFacadeMock.revert).toHaveBeenCalledWith(recipe);
    });
  });

  describe('wallet state persistence', () => {
    const siblingEntry = {
      walletId: 'sibling-wallet',
      accountId: 'sibling-account',
      networkId: midnightAccount.blockchainSpecific.networkId,
      serializedState: createSerializedState(),
    } as unknown as SerializedMidnightWallet;

    const expectedOwnEntry = {
      walletId: midnightAccount.walletId,
      accountId: midnightAccount.accountId,
      networkId: midnightAccount.blockchainSpecific.networkId,
      serializedState: {
        dust: SerialisedWalletState('dust-serialized'),
        shielded: SerialisedWalletState('shielded-serialized'),
        unshielded: SerialisedWalletState('unshielded-serialized'),
        txHistory: SerialisedWalletState('txhistory-serialized'),
      },
    };

    beforeEach(() => {
      Object.assign(dustWalletMock, {
        serializeState: vi.fn().mockResolvedValue('dust-serialized'),
      });
      Object.assign(shieldedWalletMock, {
        serializeState: vi.fn().mockResolvedValue('shielded-serialized'),
      });
      Object.assign(unshieldedWalletMock, {
        serializeState: vi.fn().mockResolvedValue('unshielded-serialized'),
      });
      const txHistoryStorage = {
        serialize: vi.fn().mockResolvedValue('txhistory-serialized'),
      } as unknown as WalletSdk.InMemoryTransactionHistoryStorage;
      vi.mocked(WalletSdk.InMemoryTransactionHistoryStorage).mockImplementation(
        // eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions -- invoked with `new`, which an arrow function cannot be
        function () {
          return txHistoryStorage;
        },
      );
      vi.mocked(store.upsert).mockReturnValue(of(void 0));
    });

    it('persists serialized state via upsert of only its own entry', async () => {
      // A sibling entry in storage must never be read, rewritten, or removed
      // by this account's persist cycle. The subscription is held open while
      // waiting: teardown halts persistence, so a completed wallet stream
      // must not be expected to write.
      vi.mocked(store.getAll).mockReturnValue(of([siblingEntry]));

      const subscription = midnightSideEffectDependencies
        .startMidnightAccountWallet({
          account:
            midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
          config,
          store,
          keyManager: createMockKeyManager({
            keys$: of(createMockAccountKeys()),
          }),
        })
        .subscribe();

      try {
        await vi.waitFor(() => {
          expect(store.upsert).toHaveBeenCalledWith(expectedOwnEntry);
        });
        expect(store.setAll).not.toHaveBeenCalled();
        expect(store.removeWhere).not.toHaveBeenCalled();
      } finally {
        subscription.unsubscribe();
      }
    });

    it('skips the storage write when the serialized state is unchanged', async () => {
      vi.useFakeTimers();
      try {
        const facadeState$ = new Subject<
          ReturnType<typeof createMockFacadeState>
        >();
        walletFacadeMock.state.mockReturnValue(facadeState$);

        const subscription = midnightSideEffectDependencies
          .startMidnightAccountWallet({
            account:
              midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
            config,
            store,
            keyManager: createMockKeyManager({
              keys$: of(createMockAccountKeys()),
            }),
          })
          .subscribe();

        // Let the async wallet init finish wiring the persist subscription
        // before the first state emission
        await vi.advanceTimersByTimeAsync(0);
        facadeState$.next(createMockFacadeState());
        await vi.advanceTimersByTimeAsync(10);
        expect(store.upsert).toHaveBeenCalledTimes(1);

        // Same serialized state again after the throttle window: fingerprint
        // matches, so no second write
        facadeState$.next(createMockFacadeState());
        await vi.advanceTimersByTimeAsync(6000);
        expect(store.upsert).toHaveBeenCalledTimes(1);

        subscription.unsubscribe();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not write a persist cycle whose serialization outlives an external stop', async () => {
      // A late write would be queued AFTER the resync/delete flow's
      // clear()/removeWhere() and revive the wiped document.
      vi.useFakeTimers();
      try {
        const facadeState$ = new Subject<
          ReturnType<typeof createMockFacadeState>
        >();
        walletFacadeMock.state.mockReturnValue(facadeState$);
        let resolveDustSerialize: (value: string) => void = () => undefined;
        Object.assign(dustWalletMock, {
          serializeState: vi.fn().mockReturnValue(
            new Promise<string>(resolve => {
              resolveDustSerialize = resolve;
            }),
          ),
        });

        const walletPromise = firstValueFrom(
          midnightSideEffectDependencies.startMidnightAccountWallet({
            account:
              midnightAccount as unknown as InMemoryWalletAccount<MidnightAccountProps>,
            config,
            store,
            keyManager: createMockKeyManager({
              keys$: of(createMockAccountKeys()),
            }),
          }),
        );

        await vi.advanceTimersByTimeAsync(0);
        facadeState$.next(createMockFacadeState());
        const wallet = await walletPromise;
        await vi.advanceTimersByTimeAsync(0);

        await firstValueFrom(wallet.stop());
        resolveDustSerialize('dust-serialized');
        await vi.advanceTimersByTimeAsync(10);

        expect(store.upsert).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

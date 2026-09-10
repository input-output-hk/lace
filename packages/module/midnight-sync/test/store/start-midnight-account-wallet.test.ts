import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import * as LaceSdkUtil from '@lace-lib/util';
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
  of,
  Subject,
  tap,
  throwError,
} from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeMidnightSideEffectDependencies } from '../../src/store/dependencies';

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
    CustomShieldedWallet: vi.fn(),
  };
});

vi.mock(
  '../../../../../node_modules/@midnightntwrk/wallet-sdk-shielded/dist/v1/V1Builder',
  () => ({
    V1Builder: vi.fn().mockReturnValue({
      withDefaults: vi.fn().mockReturnThis(),
      withSync: vi.fn().mockReturnThis(),
    }),
  }),
);

vi.mock(
  '../../../../../node_modules/@midnightntwrk/wallet-sdk-shielded/dist/v1/Sync',
  async importOriginal => {
    const actual = await importOriginal();
    return {
      ...(actual as object),
      makeEventsSyncCapability: vi.fn(),
    };
  },
);

vi.mock('@midnightntwrk/wallet-sdk/unshielded', () => ({
  PublicKey: { fromKeyStore: vi.fn() },
  UnshieldedWallet: vi.fn(),
  createKeystore: vi.fn().mockReturnValue({
    getPublicKey: vi.fn(),
    signData: vi.fn(),
  }),
}));

vi.mock('@midnight-ntwrk/ledger-v8', () => ({
  DustSecretKey: { fromSeed: vi.fn().mockReturnValue('mock-dust-secret-key') },
  ZswapSecretKeys: {
    fromSeed: vi.fn().mockReturnValue('mock-zswap-secret-keys'),
  },
  LedgerParameters: {
    initialParameters: vi.fn().mockReturnValue({ dust: {} }),
  },
}));

// ===== TEST HELPERS =====

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
  dust: LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
  shielded: LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
  unshielded: LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
  txHistory: LaceSdkUtil.HexBytes.fromUTF8('tx-history'),
});

// ===== SHARED MOCKS =====

const unshieldedWalletMock = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  serializeState: vi.fn().mockResolvedValue('unshielded-state'),
};

const shieldedWalletMock = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  serializeState: vi.fn().mockResolvedValue('shielded-state'),
};

const dustWalletMock = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  serializeState: vi.fn().mockResolvedValue('dust-state'),
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
};

WalletFacadeInitMock.mockReturnValue(
  walletFacadeMock as unknown as WalletSdkFacade.WalletFacade,
);

vi.mocked(WalletSdkDustWallet.DustWallet).mockReturnValue({
  restore: vi.fn().mockReturnValue('restored-dust'),
  startWithSeed: vi.fn().mockReturnValue('new-dust'),
} as unknown as WalletSdkDustWallet.DustWalletClass);

vi.mocked(WalletSdkShielded.CustomShieldedWallet).mockReturnValue({
  restore: vi.fn().mockReturnValue('restored-shielded'),
  startWithSeed: vi.fn().mockReturnValue('new-shielded'),
} as unknown as ReturnType<typeof WalletSdkShielded.CustomShieldedWallet>);

vi.mocked(WalletSdkUnshielded.UnshieldedWallet).mockReturnValue({
  restore: vi.fn().mockReturnValue('restored-unshielded'),
  startWithPublicKey: vi.fn().mockReturnValue('new-unshielded'),
} as unknown as WalletSdkUnshielded.UnshieldedWalletClass);

const txHistoryStorageMock = {
  serialize: vi.fn().mockResolvedValue('tx-history'),
} as unknown as WalletSdk.InMemoryTransactionHistoryStorage;

vi.mocked(WalletSdk.InMemoryTransactionHistoryStorage).mockReturnValue(
  txHistoryStorageMock,
);
vi.mocked(WalletSdk.InMemoryTransactionHistoryStorage.restore).mockReturnValue(
  txHistoryStorageMock,
);

// ===== TESTS =====

const { midnightAccount } = stubData;

const config: MidnightNetworkConfig = {
  indexerAddress: 'http://indexer.test',
  proofServerAddress: 'http://proof.test',
  nodeAddress: 'http://node.test',
};

const midnightSideEffectDependencies = initializeMidnightSideEffectDependencies(
  {} as Readonly<ModuleInitProps>,
  { logger: dummyLogger },
);

describe('startMidnightAccountWallet', () => {
  let store: CollectionStorage<SerializedMidnightWallet>;

  beforeEach(() => {
    store = {
      getAll: vi.fn().mockReturnValue(of([])),
      setAll: vi.fn().mockReturnValue(EMPTY),
      observeAll: vi.fn(),
    };
    vi.clearAllMocks();
    walletFacadeMock.state.mockReturnValue(of(createMockFacadeState()));
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
  });

  describe('wallet lifecycle', () => {
    it('starts unshielded and shielded wallets', async () => {
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
      expect(shieldedWalletMock.start).toHaveBeenCalled();
      expect(dustWalletMock.start).not.toHaveBeenCalled();
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

    it('stops wallet facade on unsubscribe', async () => {
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

      const subscription = result$.subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      subscription.unsubscribe();

      expect(walletFacadeMock.stop).toHaveBeenCalled();
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

        expect(store.setAll).toHaveBeenCalledTimes(1);

        await firstValueFrom(getWallet()!.stop());
        facadeState$.next(createMockFacadeState());
        // Well past the serialisation throttle, so a queued trailing emission
        // would have fired by now.
        await vi.advanceTimersByTimeAsync(60_000);

        expect(store.setAll).toHaveBeenCalledTimes(1);
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

        expect(store.setAll).toHaveBeenCalledTimes(1);

        getWallet()!.stop().subscribe();
        facadeState$.next(createMockFacadeState());
        await vi.advanceTimersByTimeAsync(10_000);

        expect(store.setAll).toHaveBeenCalledTimes(1);
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
          dust: LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
          shielded: LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
          unshielded: LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
          txHistory: LaceSdkUtil.HexBytes.fromUTF8('current-history'),
        }),
      );

      expect(restoredHistoryBlob()).toBe('current-history');
    });

    it('restores history from the legacy `unshieldedTxHistory` key', async () => {
      await firstValueFrom(
        startRestoredWallet({
          dust: LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
          shielded: LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
          unshielded: LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
          unshieldedTxHistory: LaceSdkUtil.HexBytes.fromUTF8('legacy-history'),
        } as unknown as SerializedMidnightWallet['serializedState']),
      );

      expect(restoredHistoryBlob()).toBe('legacy-history');
    });

    it('prefers `txHistory` over the legacy key when both are present', async () => {
      await firstValueFrom(
        startRestoredWallet({
          dust: LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
          shielded: LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
          unshielded: LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
          txHistory: LaceSdkUtil.HexBytes.fromUTF8('current-history'),
          unshieldedTxHistory: LaceSdkUtil.HexBytes.fromUTF8('legacy-history'),
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
        dust: LaceSdkUtil.HexBytes.fromUTF8('dust-state'),
        shielded: LaceSdkUtil.HexBytes.fromUTF8('shielded-state'),
        unshielded: LaceSdkUtil.HexBytes.fromUTF8('unshielded-state'),
        unshieldedTxHistory: LaceSdkUtil.HexBytes.fromUTF8('legacy-history'),
      } as unknown as SerializedMidnightWallet['serializedState']).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));

      const persistedState = vi.mocked(store.setAll).mock.calls[0]?.[0]?.[0]
        ?.serializedState;
      expect(persistedState).toHaveProperty('txHistory');
      expect(persistedState).not.toHaveProperty('unshieldedTxHistory');

      subscription.unsubscribe();
    });
  });

  describe('balance method wrappers forward tokenKindsToBalance to walletFacade', () => {
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

    it('balanceFinalizedTransaction passes tokenKindsToBalance to the facade', async () => {
      const wallet = await startWallet();

      await firstValueFrom(
        wallet.balanceFinalizedTransaction(mockTx, {
          ttl,
          tokenKindsToBalance: ['shielded'],
        }),
      );

      expect(walletFacadeMock.balanceFinalizedTransaction).toHaveBeenCalledWith(
        mockTx,
        expect.any(Object),
        { ttl, tokenKindsToBalance: ['shielded'] },
      );
    });

    it('balanceUnboundTransaction passes tokenKindsToBalance to the facade', async () => {
      const wallet = await startWallet();

      await firstValueFrom(
        wallet.balanceUnboundTransaction(mockTx, {
          ttl,
          tokenKindsToBalance: ['unshielded'],
        }),
      );

      expect(walletFacadeMock.balanceUnboundTransaction).toHaveBeenCalledWith(
        mockTx,
        expect.any(Object),
        { ttl, tokenKindsToBalance: ['unshielded'] },
      );
    });
  });
});

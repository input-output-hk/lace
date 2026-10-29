import { Percent } from '@cardano-sdk/util';
import { ActivityType } from '@lace-contract/activities';
import {
  MidnightAccountId,
  NIGHT_TOKEN_ID,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import * as fixture from '@lace-contract/midnight-context/src/stub-data';
import { BigNumber } from '@lace-lib/util';
import {
  MidnightBech32m,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnightntwrk/wallet-sdk-address-format';
import {
  BehaviorSubject,
  defaultIfEmpty,
  filter,
  firstValueFrom,
  from,
  map,
  of,
  Subject,
  timeout,
} from 'rxjs';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import {
  createLaceWallet,
  createMidnightModule,
  FEATURE_FLAG_MIDNIGHT,
  FEATURE_FLAG_MIDNIGHT_UNSHIELDED,
  FEATURE_FLAG_NETWORK_TYPE,
  isTokenFullNameValid,
  isTokenShortNameValid,
  isForbiddenTokenName,
  m,
  MidnightAccountNotFoundError,
  MidnightWalletNotReadyError,
  observeMidnightBalances,
} from '../src/midnight';

// Test-only engine boundary: the package deliberately does not export its internals.
// eslint-disable-next-line @nx/enforce-module-boundaries
import type * as Dependencies from '../../../packages/module/midnight-sync/src/store/dependencies';
import type { MidnightBalances } from '../src/midnight';
import type {
  MidnightWallet,
  SerializedMidnightWallet,
  StartMidnightAccountWalletParams,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type { WalletEntry } from '@midnightntwrk/wallet-sdk';
import type { FacadeState } from '@midnightntwrk/wallet-sdk/facade';

const { start } = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock(
  '../../../packages/module/midnight-sync/src/store/dependencies',
  async importActual => {
    const actual = await importActual<typeof Dependencies>();
    return {
      ...actual,
      createMidnightSideEffectDependencies: (
        ...args: Parameters<typeof actual.createMidnightSideEffectDependencies>
      ) => {
        const initialize = actual.createMidnightSideEffectDependencies(...args);
        return (...initArgs: Parameters<typeof initialize>) => ({
          ...initialize(...initArgs),
          startMidnightAccountWallet: start,
        });
      },
    };
  },
);

vi.setConfig({ testTimeout: 30_000 });
const { accountId, networkId, midnightAccount } = fixture;
const siblingId = MidnightAccountId(fixture.walletId, 1, networkId);
const coin = ShieldedCoinPublicKey.fromHexString('11'.repeat(32));
const encryption = ShieldedEncryptionPublicKey.fromHexString('22'.repeat(32));
const tokenType = 'aa'.repeat(32);
const unshieldedType = toUnshieldedTokenType(tokenType, networkId);
const flagList = [
  { key: FEATURE_FLAG_MIDNIGHT },
  { key: FEATURE_FLAG_MIDNIGHT_UNSHIELDED },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];
const progress = (value: number, complete: boolean) => ({
  shielded: Percent(value),
  unshielded: Percent(value),
  dust: Percent(value),
  isStrictlyComplete: {
    shielded: complete,
    unshielded: complete,
    dust: complete,
  },
});
const makeEngine = (id = accountId, night = 1n) => {
  const syncProgress$ = new BehaviorSubject(progress(0, false));
  const coinsByTokenType$ = new BehaviorSubject({
    shielded: {
      [tokenType]: [
        { status: 'available' as const, value: BigNumber(12n) },
        { status: 'pending' as const, value: BigNumber(3n) },
      ],
    },
    unshielded: {
      [unshieldedType]: [
        {
          status: 'available' as const,
          value: BigNumber(40n),
          registeredForDustGeneration: true,
        },
      ],
    },
  });
  const transactionHistory$ = new BehaviorSubject<WalletEntry[]>([]);
  const state = {
    shielded: { coinPublicKey: coin, encryptionPublicKey: encryption },
    unshielded: {
      availableCoins: [{ utxo: { type: NIGHT_TOKEN_ID, value: night } }],
      pendingCoins: [],
    },
    dust: {
      totalCoins: [
        {
          generatedNow: 100n,
          maxCap: 1000n,
          rate: 4n,
          dtime: new Date(10000),
          maxCapReachedAt: new Date(5000),
        },
      ],
      availableCoins: [{ generatedNow: 25n }],
    },
  } as unknown as FacadeState;
  // Like the engine's, the state stream does not complete; a stopped wallet's goes silent.
  const state$ = new BehaviorSubject(state);
  const engine = {
    accountId: id,
    walletId: fixture.walletId,
    networkId,
    address$: of({
      shielded: fixture.midnightShieldedAddress,
      unshielded: fixture.midnightUnshieldedAddress,
      dust: fixture.midnightDustAddress,
    }),
    state: () => state$,
    syncProgress$,
    coinsByTokenType$,
    transactionHistory$,
    stop: vi.fn(() => of(undefined)),
    getTransactionHistoryEntryByHash: (hash: string) =>
      of(transactionHistory$.value.find(entry => entry.hash === hash)),
  } as unknown as MidnightWallet;
  return { engine, syncProgress$, coinsByTokenType$, transactionHistory$ };
};
const createWallet = async () => {
  const wallet = await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      createMidnightModule({
        password: new Uint8Array([1]),
        networks: {
          [networkId]: {
            nodeAddress: 'http://localhost:9944',
            indexerAddress: 'http://localhost:8088/graphql',
          },
        },
      }),
    ] as const,
    environment: 'development',
    featureFlags: flagList,
    config: {
      defaultFeatureFlags: flagList,
      extraFeatureFlags: [],
      defaultMidnightTestnetNetworkId: networkId,
    },
  });
  // Store side effects apply loadout overrides asynchronously before accounts start.
  await firstValueFrom(
    wallet.stateObservables.midnightContext.selectCurrentNetwork$.pipe(
      filter(
        network =>
          network.config.nodeAddress === 'http://localhost:9944' &&
          network.config.indexerAddress === 'http://localhost:8088/graphql',
      ),
      timeout(5000),
    ),
  );
  return wallet;
};
const setup = async () => {
  const first = makeEngine();
  const sibling = makeEngine(siblingId);
  const restarted = makeEngine(accountId, 99n);
  let starts = 0;
  let storage!: CollectionStorage<SerializedMidnightWallet>;
  start.mockImplementation(
    ({ account, store }: StartMidnightAccountWalletParams) => {
      storage = store;
      return of(
        account.accountId === siblingId
          ? sibling.engine
          : starts++ === 0
          ? first.engine
          : restarted.engine,
      );
    },
  );
  const wallet = await createWallet();
  onTestFinished(async () => {
    wallet.dispatch('wallets.removeWallet', fixture.walletId, [
      accountId,
      siblingId,
    ]);
    await vi.waitFor(async () => {
      const [registry] = await wallet._loadModules('addons.loadMidnightEngine');
      expect(registry).toBeDefined();
      expect(await firstValueFrom(registry)).toEqual({});
    });
  });
  const emptyDust = await firstValueFrom(
    wallet.stateObservables.midnightContext.selectDustBalanceByAccount$,
  );
  expect(emptyDust[accountId]).toBeUndefined();
  expect(start).not.toHaveBeenCalled();
  wallet.dispatch('wallets.addWallet', {
    ...fixture.midnightWallet,
    accounts: [midnightAccount, { ...midnightAccount, accountId: siblingId }],
  });
  await vi.waitFor(() => {
    expect(start).toHaveBeenCalledTimes(2);
  });
  await vi.waitFor(async () => {
    expect(
      await firstValueFrom(
        wallet.stateObservables.addresses.selectByAccountId$.pipe(
          map(select => select(accountId)),
        ),
      ),
    ).toHaveLength(3);
  });
  return { wallet, first, sibling, restarted, storage };
};

beforeEach(() => {
  start.mockReset();
});

describe('public Midnight state', () => {
  it('exposes three addresses, network-encoded public keys, pending balances and generated versus spendable DUST', async () => {
    const { wallet } = await setup();
    expect(
      (
        await firstValueFrom(
          wallet.stateObservables.addresses.selectByAccountId$.pipe(
            map(select => select(accountId)),
          ),
        )
      )
        .map(a => a.address)
        .sort(),
    ).toEqual(
      [
        fixture.midnightShieldedAddress,
        fixture.midnightDustAddress,
        fixture.midnightUnshieldedAddress,
      ].sort(),
    );
    const keys = await firstValueFrom(
      wallet.stateObservables.midnightContext.selectPublicKeysByAccountId$.pipe(
        map(select => select(accountId)),
      ),
    );
    expect(keys?.coin).toBe(
      ShieldedCoinPublicKey.codec
        .decode(
          networkId,
          MidnightBech32m.parse(
            ShieldedCoinPublicKey.codec.encode(networkId, coin).asString(),
          ),
        )
        .toHexString(),
    );
    expect(keys?.encryption).toBe(
      ShieldedEncryptionPublicKey.codec
        .decode(
          networkId,
          MidnightBech32m.parse(
            ShieldedEncryptionPublicKey.codec
              .encode(networkId, encryption)
              .asString(),
          ),
        )
        .toHexString(),
    );
    expect(
      (
        await firstValueFrom(
          wallet.stateObservables.midnightContext.selectDustBalanceByAccount$,
        )
      )[accountId],
    ).toBe('100');
    expect(
      (
        await firstValueFrom(
          wallet.stateObservables.midnightContext.selectDustAvailableByAccount$,
        )
      )[accountId],
    ).toBe('25');
    expect(
      (
        await firstValueFrom(
          wallet.stateObservables.midnightContext.selectDustGenerationDetails$.pipe(
            map(select => select([accountId])),
          ),
        )
      )[accountId],
    ).toEqual({
      currentValue: 100n,
      maxCap: 1000n,
      rate: 4n,
      decayTime: 10000,
      maxCapReachedAt: 5000,
    });
    const tokens = await firstValueFrom(
      wallet.stateObservables.tokens.selectAggregatedTokensByAccountId$.pipe(
        map(select => select(accountId)),
      ),
    );
    expect(tokens.find(t => t.tokenId === tokenType)).toMatchObject({
      available: '12',
      pending: '3',
    });
    expect(tokens.find(t => t.tokenId === unshieldedType)).toMatchObject({
      available: '40',
      metadata: {
        blockchainSpecific: {
          coins: [
            expect.objectContaining({ registeredForDustGeneration: true }),
          ],
        },
      },
    });
  });

  it('requires strict completion and exposes a failed operation', async () => {
    const { wallet, first } = await setup();
    const status = async () =>
      (
        await firstValueFrom(
          wallet.stateObservables.sync.selectSyncStatusByAccount$,
        )
      )[accountId];
    first.syncProgress$.next(progress(1, false));
    await vi.waitFor(async () => {
      expect(
        (await status()).pendingSync?.operations[`${accountId}-midnight-sync`],
      ).toMatchObject({ status: 'InProgress', progress: 1 });
    });
    expect((await status()).lastSuccessfulSync).toBeUndefined();
    first.syncProgress$.next(progress(1, true));
    await vi.waitFor(async () => {
      expect((await status()).lastSuccessfulSync).toBeDefined();
    });
    expect((await status()).pendingSync).toBeUndefined();
    first.syncProgress$.next(progress(0.5, false));
    await vi.waitFor(async () => {
      expect((await status()).pendingSync).toBeDefined();
    });
    wallet.dispatch('sync.failSyncOperation', {
      accountId,
      operationId: `${accountId}-midnight-sync`,
      error: 'sync.error.midnight-sync-failed',
    });
    await vi.waitFor(async () => {
      expect((await status()).lastFailedSync).toBeDefined();
    });
  });

  it('retains a renamed token and registration metadata across the next sync update', async () => {
    const { wallet, first } = await setup();
    const metadatas = async () =>
      firstValueFrom(wallet.stateObservables.tokens.selectTokensMetadata$);
    const metadata = (await metadatas())[
      unshieldedType as keyof Awaited<ReturnType<typeof metadatas>>
    ]!;
    const name = '  Aurora  '.trim();
    const ticker = ' AUR '.trim();
    expect(isTokenFullNameValid(name, ['Other'])).toBe(true);
    expect(isTokenShortNameValid(ticker, ['Other'])).toBe(true);
    wallet.dispatch('tokens.upsertTokenMetadata', {
      ...metadata,
      name,
      ticker,
    });
    await vi.waitFor(async () => {
      expect((await metadatas())[metadata.tokenId]?.name).toBe('Aurora');
    });
    first.coinsByTokenType$.next({
      ...first.coinsByTokenType$.value,
      unshielded: {
        [unshieldedType]: [
          {
            status: 'available',
            value: BigNumber(45n),
            registeredForDustGeneration: true,
          },
        ],
      },
    });
    await vi.waitFor(async () => {
      expect(
        (
          await firstValueFrom(
            wallet.stateObservables.tokens.selectAggregatedTokensByAccountId$.pipe(
              map(select => select(accountId)),
            ),
          )
        ).find(t => t.tokenId === unshieldedType)?.available,
      ).toBe('45');
    });
    expect((await metadatas())[metadata.tokenId]).toMatchObject({
      name: 'Aurora',
      ticker: 'AUR',
      decimals: metadata.decimals,
      blockchainSpecific: {
        coins: [expect.objectContaining({ registeredForDustGeneration: true })],
      },
    });
    for (const reserved of ['NIGHT', 'dust', 'Lace', 'Midnight', 'tNIGHT'])
      expect(isForbiddenTokenName(reserved)).toBe(true);
    for (const invalid of ['', ' ', 'nIgHt', 'x'.repeat(100), 'aUrOrA'])
      expect(isTokenFullNameValid(invalid, ['Aurora'])).toBe(false);
    expect(isTokenShortNameValid('TOOLONG')).toBe(false);
    expect(
      isTokenFullNameValid(
        name,
        ['Aurora', 'Other'].filter(t => t !== name),
      ),
    ).toBe(true);
  });

  it('dispatches a scoped resync, wipes corrupt cached state, and restarts without reloading its sibling', async () => {
    const { wallet, first, sibling, storage } = await setup();
    const siblingDocument = {
      accountId: siblingId,
      serializedState: null,
    } as unknown as SerializedMidnightWallet;
    await firstValueFrom(
      storage.upsert({
        accountId,
        serializedState: null,
      } as unknown as SerializedMidnightWallet),
    );
    await firstValueFrom(storage.upsert(siblingDocument));
    wallet.dispatch('midnightContext.resetSyncState', { accountId });
    await vi.waitFor(() => {
      expect(start).toHaveBeenCalledTimes(3);
    });
    expect(first.engine.stop).toHaveBeenCalled();
    expect(sibling.engine.stop).not.toHaveBeenCalled();
    expect(
      await firstValueFrom(
        storage.get(String(accountId)).pipe(defaultIfEmpty(undefined)),
      ),
    ).toBeUndefined();
    expect(await firstValueFrom(storage.get(String(siblingId)))).toEqual(
      siblingDocument,
    );
  });

  it.each(['rejected promise', 'synchronous throw'])(
    'contains a %s during failed reset, retry and old-watcher teardown',
    async failureMode => {
      const { wallet, first, sibling, restarted, storage } = await setup();
      const stopError = new Error('facade stop failed');
      vi.mocked(first.engine.stop).mockImplementation(() => {
        if (failureMode === 'synchronous throw') throw stopError;
        return from(Promise.reject(stopError));
      });
      const document = {
        accountId,
        serializedState: null,
      } as unknown as SerializedMidnightWallet;
      const siblingDocument = { ...document, accountId: siblingId };
      await firstValueFrom(storage.upsert(document));
      await firstValueFrom(storage.upsert(siblingDocument));
      const statuses = async () =>
        firstValueFrom(wallet.stateObservables.sync.selectSyncStatusByAccount$);
      const [registry] = await wallet._loadModules('addons.loadMidnightEngine');
      expect(registry).toBeDefined();

      wallet.dispatch('midnightContext.resetSyncState', { accountId });
      await vi.waitFor(async () => {
        expect(
          (await statuses())[accountId].pendingSync?.operations[
            `${accountId}-midnight-sync`
          ],
        ).toMatchObject({ status: 'Failed' });
      });
      expect(start).toHaveBeenCalledTimes(2);
      expect(first.engine.stop).toHaveBeenCalledOnce();
      expect(await firstValueFrom(storage.get(String(accountId)))).toEqual(
        document,
      );

      wallet.dispatch('midnightContext.resetSyncState', { accountId });
      await vi.waitFor(() => {
        expect(start).toHaveBeenCalledTimes(3);
        expect(first.engine.stop).toHaveBeenCalledTimes(2);
      });
      // Let RxJS's default reportUnhandledError timer fire; no global error hook.
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(await firstValueFrom(registry)).toEqual({
        [accountId]: restarted.engine,
        [siblingId]: sibling.engine,
      });
      expect(sibling.engine.stop).not.toHaveBeenCalled();
      expect(
        await firstValueFrom(
          storage.get(String(accountId)).pipe(defaultIfEmpty(undefined)),
        ),
      ).toBeUndefined();
      expect(await firstValueFrom(storage.get(String(siblingId)))).toEqual(
        siblingDocument,
      );
      sibling.syncProgress$.next(progress(1, true));
      restarted.syncProgress$.next(progress(1, true));
      await vi.waitFor(async () => {
        const state = await statuses();
        expect(state[siblingId].lastSuccessfulSync).toBeDefined();
        expect(state[accountId].lastSuccessfulSync).toBeDefined();
        expect(state[accountId].pendingSync).toBeUndefined();
      });
      first.syncProgress$.next(progress(0.5, false));
      await new Promise(resolve => setTimeout(resolve, 10));
      expect((await statuses())[accountId].pendingSync).toBeUndefined();

      wallet.dispatch('wallets.removeWallet', fixture.walletId, [
        accountId,
        siblingId,
      ]);
      await vi.waitFor(async () => {
        expect(await firstValueFrom(registry)).toEqual({});
        expect(restarted.engine.stop).toHaveBeenCalled();
        expect(sibling.engine.stop).toHaveBeenCalled();
      });
      const replacementStops = vi.mocked(restarted.engine.stop).mock.calls
        .length;
      const siblingStops = vi.mocked(sibling.engine.stop).mock.calls.length;
      wallet.dispatch('wallets.removeWallet', fixture.walletId, [
        accountId,
        siblingId,
      ]);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(await firstValueFrom(registry)).toEqual({});
      expect(restarted.engine.stop).toHaveBeenCalledTimes(replacementStops);
      expect(sibling.engine.stop).toHaveBeenCalledTimes(siblingStops);
    },
  );

  it('loads send, receive, self and failed details while suppressing shielded-only rows', async () => {
    const { wallet, first } = await setup();
    const utxo = {
      value: 10n,
      owner: 'destination',
      tokenType,
      intentHash: 'intent',
      outputIndex: 0,
    };
    const entry = (
      hash: string,
      {
        created = false,
        spent = false,
        status = 'SUCCESS',
      }: {
        created?: boolean;
        spent?: boolean;
        status?: WalletEntry['status'];
      },
    ): WalletEntry => ({
      hash,
      protocolVersion: 1,
      identifiers: [],
      timestamp: new Date(123000),
      fees: 4n,
      status,
      unshielded: {
        id: 1,
        createdUtxos: created ? [utxo] : [],
        spentUtxos: spent ? [utxo] : [],
      },
    });
    first.transactionHistory$.next([
      entry('send', { spent: true }),
      entry('receive', { created: true }),
      entry('self', { created: true, spent: true }),
      entry('failed', { spent: true, status: 'FAILURE' }),
      entry('shielded-only', {}),
    ]);
    const rows = async () =>
      firstValueFrom(
        wallet.stateObservables.activities.selectByAccountId$.pipe(
          map(select => select({ accountId })),
        ),
      );
    await vi.waitFor(async () => {
      expect(await rows()).toHaveLength(4);
    });
    const expected = {
      send: ActivityType.Send,
      receive: ActivityType.Receive,
      self: ActivityType.Self,
      failed: ActivityType.Failed,
    };
    for (const activity of await rows()) {
      expect(activity.type).toBe(
        expected[activity.activityId as keyof typeof expected],
      );
      wallet.dispatch('activities.loadActivityDetails', {
        blockchainName: 'Midnight',
        activity,
      });
      await vi.waitFor(async () => {
        expect(
          await firstValueFrom(
            wallet.stateObservables.activities.selectActivityDetails$,
          ),
        ).toMatchObject({
          activityId: activity.activityId,
          address: 'destination',
          timestamp: 123000,
          fee: '4',
        });
      });
    }
    wallet.dispatch('activities.loadActivityDetails', {
      blockchainName: 'Midnight',
      activity: { ...(await rows())[0], activityId: 'missing' },
    });
    await vi.waitFor(async () => {
      expect(
        await firstValueFrom(
          wallet.stateObservables.activities.selectActivityDetails$,
        ),
      ).toBeUndefined();
    });
  });

  it('midnight-balances-follow-instance: follows the replacement engine wallet after a sync reset', async () => {
    const { wallet, first } = await setup();
    const nightAvailable: bigint[] = [];
    const subscription = observeMidnightBalances(wallet, {
      accountId,
    }).subscribe(balances => {
      nightAvailable.push(balances.night.available);
    });
    onTestFinished(() => {
      subscription.unsubscribe();
    });
    await vi.waitFor(() => {
      expect(nightAvailable).toEqual([1n]);
    });

    wallet.dispatch('midnightContext.resetSyncState', { accountId });
    await vi.waitFor(() => {
      expect(start).toHaveBeenCalledTimes(3);
      expect(nightAvailable).toEqual([1n, 99n]);
    });
    expect(first.engine.stop).toHaveBeenCalled();
  });

  it('resolves the account on subscription: a missing account errors the subscriber and rejects nothing unobserved', async () => {
    const unhandledRejection = vi.fn();
    process.on('unhandledRejection', unhandledRejection);
    onTestFinished(() => {
      process.off('unhandledRejection', unhandledRejection);
    });
    const wallet = await createWallet();

    const balances$ = observeMidnightBalances(wallet);
    // Long enough for an eagerly started lookup to reject and be reported.
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(unhandledRejection).not.toHaveBeenCalled();

    await expect(firstValueFrom(balances$)).rejects.toBeInstanceOf(
      MidnightAccountNotFoundError,
    );
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(unhandledRejection).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('midnight-balances-follow-instance: marks the last balances unsynced while a reset leaves the account without a wallet, then fails as a new subscriber does', async () => {
    const { wallet, first } = await setup();
    first.syncProgress$.next(progress(1, true));
    start.mockImplementation(() => new Subject<MidnightWallet>());
    const startTimeout = 300;
    const seen: MidnightBalances[] = [];
    let failure: unknown;
    const subscription = observeMidnightBalances(wallet, {
      accountId,
      startTimeout,
    }).subscribe({
      next: balances => {
        seen.push(balances);
      },
      error: (error: unknown) => {
        failure = error;
      },
    });
    onTestFinished(() => {
      subscription.unsubscribe();
    });
    const synced = { unshielded: true, shielded: true, dust: true };
    await vi.waitFor(() => {
      expect(seen.at(-1)).toMatchObject({ night: { available: 1n }, synced });
    });

    wallet.dispatch('midnightContext.resetSyncState', { accountId });
    await vi.waitFor(() => {
      expect(first.engine.stop).toHaveBeenCalled();
      expect(seen.at(-1)).toMatchObject({
        night: { available: 1n },
        dust: { balance: 100n, available: 25n },
        synced: { unshielded: false, shielded: false, dust: false },
      });
    });
    expect(failure).toBeUndefined();

    await expect(
      firstValueFrom(
        observeMidnightBalances(wallet, { accountId, startTimeout }),
      ),
    ).rejects.toBeInstanceOf(MidnightWalletNotReadyError);
    await vi.waitFor(() => {
      expect(failure).toBeInstanceOf(MidnightWalletNotReadyError);
    });
    expect(seen.filter(balances => balances.synced.dust)).toHaveLength(1);
  });
});

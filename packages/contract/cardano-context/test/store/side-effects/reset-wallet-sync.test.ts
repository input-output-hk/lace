import { Cardano } from '@cardano-sdk/core';
import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { uiActions } from '@lace-contract/app';
import { failuresActions } from '@lace-contract/failures';
import { syncActions } from '@lace-contract/sync';
import { syncReducers } from '@lace-contract/sync/src/store/slice';
import { tokensActions, TokenId } from '@lace-contract/tokens';
import { Timestamp, Ok, BigNumber } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import {
  BehaviorSubject,
  combineLatest,
  map,
  of,
  Subject,
  throwError,
} from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cardanoContextActions,
  cardanoContextSelectors,
} from '../../../src/store';
import { resetWalletSync } from '../../../src/store/side-effects/reset-wallet-sync';
import {
  createSyncOperationId,
  CardanoSyncOperationType,
} from '../../../src/store/side-effects/sync-operation-utils';
import {
  CardanoUtxoFetchFailureId,
  CardanoRewardAccountDetailsFailureId,
  TokenMetadataFailureId,
} from '../../../src/value-objects';
import {
  cardanoAccount0Addr,
  account0someAdaTokens,
  threeAccountCardanoWalletAccounts,
  utxo1,
} from '../../mocks';
import { multiSigAccount } from '../../multisig-mocks';

import type { CardanoContextAction } from '../../../src/contract';
import type {
  CardanoAccountTransactionsHistoryMap,
  CardanoProvider,
} from '../../../src/types';
import type {
  Activity,
  PendingActivitiesByAccount,
} from '@lace-contract/activities';
import type { SyncSliceState } from '@lace-contract/sync';
import type { RawToken } from '@lace-contract/tokens';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { ObservedValueOf } from 'rxjs';

const actions = {
  ...cardanoContextActions,
  ...activitiesActions,
  ...syncActions,
  ...tokensActions,
  ...failuresActions,
  ...uiActions,
};
const account = threeAccountCardanoWalletAccounts[0];
const accountId = account.accountId;
const otherId = threeAccountCardanoWalletAccounts[1].accountId;
const subscriptions: Array<{ unsubscribe(): void }> = [];
afterEach(() => {
  subscriptions.splice(0).forEach(s => {
    s.unsubscribe();
  });
});

const setup = (activeAccount: AnyAccount = account) => {
  const accountId = activeAccount.accountId;
  const getTokenMetadata = vi
    .fn<CardanoProvider['getTokenMetadata']>()
    .mockReturnValue(
      of(Ok({ decimals: 6, blockchainSpecific: { updatedAt: Timestamp(1) } })),
    );
  const request$ = new Subject<
    ReturnType<typeof actions.cardanoContext.requestWalletSyncReset>
  >();
  const completed$ = new Subject<
    ReturnType<typeof actions.sync.completeSyncOperation>
  >();
  const failed$ = new Subject<
    ReturnType<typeof actions.sync.failSyncOperation>
  >();
  const utxos$ = new Subject<
    ReturnType<typeof actions.cardanoContext.setAccountUtxos>
  >();
  const rewardDetails$ = new Subject<
    ReturnType<typeof actions.cardanoContext.setRewardAccountDetails>
  >();
  const rewards$ = new Subject<
    ReturnType<typeof actions.cardanoContext.setAccountRewardsHistory>
  >();
  const failure$ = new Subject<
    ReturnType<typeof actions.failures.addFailure>
  >();
  const resumed$ = new Subject<void>();
  const cleared$ = new Subject<
    ReturnType<typeof actions.sync.clearPendingSyncsForAccounts>
  >();
  const accounts$ = new BehaviorSubject<AnyAccount[]>([activeAccount]);
  const pending$ = new BehaviorSubject<PendingActivitiesByAccount>({});
  const status$ = new BehaviorSubject<SyncSliceState['syncStatusByAccount']>(
    {},
  );
  const history$ = new BehaviorSubject<CardanoAccountTransactionsHistoryMap>(
    {},
  );
  const activities$ = new BehaviorSubject<Record<AccountId, Activity[]>>({});
  const rawTokens$ = new BehaviorSubject<RawToken[]>([]);
  const metadataUpsert$ = new Subject<
    ReturnType<typeof actions.tokens.upsertTokensMetadata>
  >();
  const result$ = new Subject<
    ReturnType<typeof actions.cardanoContext.setWalletSyncResetResult>
  >();
  const results: CardanoContextAction[] = [];
  testSideEffect(resetWalletSync, () => ({
    actionObservables: {
      cardanoContext: {
        requestWalletSyncReset$: request$,
        setWalletSyncResetResult$: result$,
        setAccountUtxos$: utxos$,
        setAccountRewardsHistory$: rewards$,
        setRewardAccountDetails$: rewardDetails$,
      },
      sync: {
        completeSyncOperation$: completed$,
        failSyncOperation$: failed$,
        clearPendingSyncsForAccounts$: cleared$,
      },
      failures: { addFailure$: failure$ },
      tokens: { upsertTokensMetadata$: metadataUpsert$ },
    },
    stateObservables: {
      failures: { selectFailureById$: of(() => undefined) },
      wallets: { selectActiveNetworkAccounts$: accounts$ },
      activities: {
        selectPendingActivitiesByAccount$: pending$,
        selectAllMap$: activities$,
        selectDesiredLoadedActivitiesCountPerAccount$: of({}),
      },
      sync: { selectSyncStatusByAccount$: status$ },
      tokens: {
        selectAllRaw$: rawTokens$,
        selectTokensMetadata$: of({
          lovelace: { tokenId: TokenId('lovelace'), blockchainSpecific: {} },
          cachedCardano: {
            tokenId: TokenId('cachedCardano'),
            blockchainSpecific: { policyId: 'policy' },
          },
          bitcoin: { tokenId: TokenId('bitcoin'), blockchainSpecific: {} },
          midnight: { tokenId: TokenId('midnight'), blockchainSpecific: {} },
        }),
      },
      addresses: {
        selectAllAddresses$: of([
          {
            ...cardanoAccount0Addr,
            accountId,
            data: {
              ...(cardanoAccount0Addr.data as object),
              rewardAccount:
                'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
              networkMagic: account.blockchainSpecific.chainId.networkMagic,
              networkId: account.blockchainSpecific.chainId.networkId,
            },
          },
        ]),
      },
      cardanoContext: {
        selectTip$: of(undefined),
        selectChainId$: of(account.blockchainSpecific.chainId),
        selectWalletSyncResetBlockedReason$: combineLatest([
          accounts$,
          pending$,
          status$,
        ]).pipe(
          map(
            ([accounts, pending, statuses]) =>
              (id: AccountId) =>
                cardanoContextSelectors.cardanoContext.selectWalletSyncResetBlockedReason.resultFunc(
                  accounts.find(account => account.accountId === id),
                  pending,
                  statuses,
                ),
          ),
        ),
        selectTransactionHistoryGroupedByAccount$: history$,
        selectRewardsHistoryGroupedByAccount$: of({}),
        selectEraSummaries$: of([]),
        selectProtocolParameters$: of({
          coinsPerUtxoByte: 4310,
          collateralPercentage: 150,
          desiredNumberOfPools: 500,
          dRepDeposit: 500000000,
          maxCollateralInputs: 3,
          maxTxSize: 16384,
          maxValueSize: 5000,
          minFeeCoefficient: 44,
          minFeeConstant: 155381,
          minFeeRefScriptCostPerByte: '15',
          monetaryExpansion: '0.003',
          poolDeposit: 500000000,
          poolInfluence: '0.3',
          prices: { memory: 0.0577, steps: 0.0000721 },
          stakeKeyDeposit: 2000000,
        }),
      },
    },
    dependencies: {
      actions,
      walletResumed$: resumed$,
      cardanoProvider: {
        getTip: vi.fn(),
        discoverAddresses: vi.fn(),
        getTokens: vi.fn(),
        getTokenMetadata,
        getAddressTransactionHistory: vi.fn(),
        getAccountRewards: vi.fn(),
        getAccountDelegations: vi.fn(),
        getAccountRegistrations: vi.fn(),
        getAccountWithdrawals: vi.fn(),
        getAccountUtxos: vi.fn(),
        getUtxosAtAddress: vi.fn(),
        getRewardAccountInfo: vi.fn(),
        getTransactionDetails: vi.fn(),
        getProtocolParameters: vi.fn(),
        getEraSummaries: vi.fn(),
        resolveInput: vi.fn(),
        submitTx: vi.fn(),
        evaluateTx: vi.fn(),
        getDReps: vi.fn(),
      },
    },
    assertion: source => {
      subscriptions.push(
        source.subscribe(a => {
          results.push(a);
          status$.next(
            syncReducers.sync({ syncStatusByAccount: status$.value }, a)
              .syncStatusByAccount,
          );
          if (actions.cardanoContext.setWalletSyncResetResult.match(a))
            result$.next(a);
        }),
      );
    },
  }));
  const request = (id = accountId) => {
    request$.next(
      actions.cardanoContext.requestWalletSyncReset({ accountId: id }),
    );
  };
  const complete = (type: CardanoSyncOperationType, id = accountId) => {
    const reset = results
      .filter(actions.sync.addSyncOperation.match)
      .findLast(a =>
        a.payload.operation.operationId.endsWith('-wallet-reset'),
      )!;
    const operationId =
      id === accountId
        ? reset.payload.operation.operationId.replace(/wallet-reset$/, type)
        : createSyncOperationId(id, undefined, type);
    if (type === CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH) {
      status$.next(
        syncReducers.sync(
          { syncStatusByAccount: status$.value },
          actions.sync.addSyncOperation({
            accountId: id,
            operation: {
              operationId: operationId.replace(
                /address-discovery-thorough$/,
                'transaction-polling',
              ),
              status: 'Pending',
              description: 'sync.operation.transaction-polling',
              startedAt: Timestamp(0),
            },
          }),
        ).syncStatusByAccount,
      );
    }
    const action = actions.sync.completeSyncOperation({
      accountId: id,
      operationId,
    });
    status$.next(
      syncReducers.sync({ syncStatusByAccount: status$.value }, action)
        .syncStatusByAccount,
    );
    completed$.next(action);
  };
  const setRewardDetails = () => {
    rewardDetails$.next(
      actions.cardanoContext.setRewardAccountDetails({
        accountId,
        details: {
          rewardAccountInfo: {
            isActive: false,
            isRegistered: false,
            rewardsSum: BigNumber(0n),
            controlledAmount: BigNumber(0n),
            withdrawableAmount: BigNumber(0n),
          },
        },
      }),
    );
  };
  const setRewards = (includeDetails = true) => {
    if (includeDetails) setRewardDetails();
    rewards$.next(
      actions.cardanoContext.setAccountRewardsHistory({
        accountId,
        rewardsHistory: {},
      }),
    );
  };
  const setUtxos = (id = accountId, utxos: Cardano.Utxo[] = []) => {
    utxos$.next(
      actions.cardanoContext.setAccountUtxos({ accountId: id, utxos }),
    );
  };
  return {
    request,
    complete,
    setUtxos,
    setRewards,
    setRewardDetails,
    failed$,
    failure$,
    accounts$,
    pending$,
    status$,
    history$,
    activities$,
    results,
    resumed$,
    cleared$,
    rawTokens$,
    metadataUpsert$,
    getTokenMetadata,
    completed$,
  };
};

describe('resetWalletSync', () => {
  it('waits for current reward details and reports their failure before timeout', () => {
    const h = setup();
    h.request();
    h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    h.setUtxos();
    h.setRewards(false);
    h.complete(CardanoSyncOperationType.TRANSACTION_POLLING);
    expect(
      h.results.some(actions.cardanoContext.setWalletSyncResetResult.match),
    ).toBe(false);
    h.failure$.next(
      actions.failures.addFailure({
        failureId: CardanoRewardAccountDetailsFailureId(accountId),
        message: 'sync.error.cardano-reward-account-details-failed',
      }),
    );
    expect(h.results.at(-1)).toEqual(
      actions.cardanoContext.setWalletSyncResetResult({
        accountId,
        status: 'Failed',
        error: 'sync.error.cardano-reward-account-details-failed',
      }),
    );
  });
  it('releases a timed-out SDK reset and allows repeated retries without accepting a previous attempt completion', () => {
    vi.useFakeTimers();
    try {
      const h = setup();
      h.request();
      const first = h.results.filter(actions.sync.addSyncOperation.match)[0]
        .payload.operation.operationId;
      vi.advanceTimersByTime(300_000);
      expect(
        cardanoContextSelectors.cardanoContext.selectWalletSyncResetOperation.resultFunc(
          h.status$.value,
          accountId,
        ),
      ).toBeUndefined();
      expect(h.status$.value[accountId].lastFailedSync).toBeDefined();
      h.request();
      expect(
        cardanoContextSelectors.cardanoContext.selectWalletSyncResetOperation.resultFunc(
          h.status$.value,
          accountId,
        ),
      ).toMatchObject({ status: 'InProgress', progress: 0 });
      h.completed$.next(
        actions.sync.completeSyncOperation({
          accountId,
          operationId: first.replace(
            /wallet-reset$/,
            'address-discovery-thorough',
          ),
        }),
      );
      expect(
        h.results.filter(actions.cardanoContext.refetchAccountUtxos.match),
      ).toHaveLength(0);
      h.failure$.next(
        actions.failures.addFailure({
          failureId: CardanoUtxoFetchFailureId(accountId),
          message: 'sync.error.cardano-utxo-fetch-failed',
        }),
      );
      expect(
        cardanoContextSelectors.cardanoContext.selectWalletSyncResetOperation.resultFunc(
          h.status$.value,
          accountId,
        ),
      ).toBeUndefined();
      h.request();
      h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
      h.setUtxos();
      h.setRewards();
      h.complete(CardanoSyncOperationType.TRANSACTION_POLLING);
      expect(h.status$.value[accountId].pendingSync).toBeUndefined();
      expect(h.results.at(-1)).toEqual(
        actions.cardanoContext.setWalletSyncResetResult({
          accountId,
          status: 'Completed',
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('publishes progress then releases the failed round and cancels late results', () => {
    const h = setup();
    h.request();
    h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    expect(
      cardanoContextSelectors.cardanoContext.selectWalletSyncResetOperation.resultFunc(
        h.status$.value,
        accountId,
      ),
    ).toMatchObject({ status: 'InProgress', progress: 1 / 7 });
    h.failure$.next(
      actions.failures.addFailure({
        failureId: CardanoUtxoFetchFailureId(accountId),
        message: 'sync.error.cardano-utxo-fetch-failed',
      }),
    );
    expect(h.results.at(-1)).toEqual(
      actions.cardanoContext.setWalletSyncResetResult({
        accountId,
        status: 'Failed',
        error: 'sync.error.cardano-utxo-fetch-failed',
      }),
    );
    expect(h.status$.value[accountId].pendingSync).toBeUndefined();
    expect(h.status$.value[accountId].lastFailedSync).toBeDefined();
    const count = h.results.length;
    h.setUtxos();
    h.setRewards();
    expect(h.results).toHaveLength(count);
  });
  it.each([false, true])(
    'completes a multisig reset after fresh rewards, UTXOs, metadata and history (funded: %s)',
    funded => {
      const h = setup(multiSigAccount);
      const id = multiSigAccount.accountId;
      h.accounts$.next([multiSigAccount, account]);
      h.request();
      h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
      h.setUtxos(id, funded ? [utxo1] : []);
      h.setRewards();
      expect(
        h.results.some(a =>
          actions.cardanoContext.setWalletSyncResetResult.match(a),
        ),
      ).toBe(false);
      h.complete(CardanoSyncOperationType.TRANSACTION_POLLING);
      expect(h.results).toContainEqual(
        actions.cardanoContext.setWalletSyncResetResult({
          accountId: id,
          status: 'Completed',
        }),
      );
      expect(
        h.results.filter(actions.cardanoContext.resetWalletSyncState.match),
      ).toEqual([
        actions.cardanoContext.resetWalletSyncState({ accountId: id }),
      ]);
    },
  );

  it('rejects a second request before the first reset has reached Redux', () => {
    const h = setup();
    h.request();
    h.request();
    expect(h.results.filter(actions.sync.addSyncOperation.match)).toHaveLength(
      2,
    );
    expect(h.results.at(-1)).toEqual(
      actions.ui.showToast({
        text: 'v2.account-settings.hd-wallet-sync.toast.error',
        color: 'negative',
        leftIcon: { name: 'Warning' },
      }),
    );
  });

  it('uses a new operation ID after resume at the same tip and ignores the old reset failure', () => {
    const h = setup();
    h.request();
    h.resumed$.next();
    h.status$.next({});
    h.request();
    const operations = h.results.filter(actions.sync.addSyncOperation.match);
    expect(operations).toHaveLength(4);
    const first = operations[0].payload.operation.operationId;
    expect(operations[2].payload.operation.operationId).not.toBe(first);
    const count = h.results.length;
    h.failed$.next(
      actions.sync.failSyncOperation({
        accountId,
        operationId: first,
        error: 'sync.error.token-metadata-fetch-failed',
      }),
    );
    expect(h.results).toHaveLength(count);
  });

  it('refreshes assets newly discovered in fresh UTXOs', () => {
    const h = setup();
    const assetId = Cardano.AssetId('a'.repeat(56));
    h.request();
    h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    h.setUtxos(accountId, [
      [
        utxo1[0],
        {
          ...utxo1[1],
          value: { coins: 10n, assets: new Map([[assetId, 1n]]) },
        },
      ],
    ]);
    expect(h.getTokenMetadata).toHaveBeenCalledExactlyOnceWith(
      { tokenId: TokenId(assetId) },
      { chainId: account.blockchainSpecific.chainId },
    );
    expect(h.results).toContainEqual(
      actions.tokens.upsertTokensMetadata({
        metadatas: [
          {
            tokenId: TokenId(assetId),
            decimals: 6,
            blockchainSpecific: { updatedAt: Timestamp(1) },
          },
        ],
      }),
    );
  });

  it('ignores unrelated metadata failures and cancels its own refresh on resume', () => {
    const h = setup();
    const token = { ...account0someAdaTokens, accountId };
    const metadata$ = new Subject<
      ObservedValueOf<ReturnType<CardanoProvider['getTokenMetadata']>>
    >();
    h.getTokenMetadata.mockReturnValue(metadata$);
    h.rawTokens$.next([token]);
    h.request();
    h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    h.setUtxos();
    h.failure$.next(
      actions.failures.addFailure({
        failureId: TokenMetadataFailureId(token.tokenId),
        message: 'sync.error.token-metadata-fetch-failed',
      }),
    );
    expect(h.results.some(actions.sync.failSyncOperation.match)).toBe(false);
    h.resumed$.next();
    const count = h.results.length;
    metadata$.next(
      Ok({ decimals: 6, blockchainSpecific: { updatedAt: Timestamp(1) } }),
    );
    metadata$.complete();
    expect(h.results).toHaveLength(count);
  });

  it('reports a metadata refresh failure without evicting cached metadata', () => {
    vi.useFakeTimers();
    try {
      const h = setup();
      const token = { ...account0someAdaTokens, accountId };
      h.rawTokens$.next([token]);
      h.request();
      h.getTokenMetadata.mockReturnValue(
        throwError(() => new Error('Metadata unavailable')),
      );
      h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
      h.setUtxos();
      vi.advanceTimersByTime(3000);
      h.failure$.next(
        actions.failures.addFailure({
          failureId: TokenMetadataFailureId(token.tokenId),
          message: 'sync.error.token-metadata-fetch-failed',
        }),
      );
      expect(h.results.at(-1)).toEqual(
        actions.cardanoContext.setWalletSyncResetResult({
          accountId,
          status: 'Failed',
          error: 'sync.error.token-metadata-fetch-failed',
        }),
      );
      expect(h.results.some(actions.tokens.upsertTokensMetadata.match)).toBe(
        false,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshes only the selected account metadata and waits for the response', () => {
    const h = setup();
    const selected = { ...account0someAdaTokens, accountId };
    const other = {
      ...account0someAdaTokens,
      accountId: otherId,
      tokenId: TokenId('other'),
    };
    h.rawTokens$.next([selected, other]);
    const metadata$ = new Subject<
      ObservedValueOf<ReturnType<CardanoProvider['getTokenMetadata']>>
    >();
    h.getTokenMetadata.mockReturnValue(metadata$);
    h.request();
    h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    h.complete(CardanoSyncOperationType.TRANSACTION_POLLING);
    h.setRewards();
    h.setUtxos();
    expect(
      h.results.some(a => a.type === actions.sync.completeSyncOperation.type),
    ).toBe(false);
    h.metadataUpsert$.next(
      actions.tokens.upsertTokensMetadata({
        metadatas: [
          { tokenId: selected.tokenId, decimals: 6, blockchainSpecific: {} },
        ],
      }),
    );
    expect(h.results.some(actions.sync.completeSyncOperation.match)).toBe(
      false,
    );
    expect(h.getTokenMetadata).toHaveBeenCalledExactlyOnceWith(
      { tokenId: selected.tokenId },
      { chainId: account.blockchainSpecific.chainId },
    );
    metadata$.next(
      Ok({ decimals: 6, blockchainSpecific: { updatedAt: Timestamp(1) } }),
    );
    metadata$.complete();
    expect(h.results.at(-2)?.type).toBe(
      actions.sync.completeSyncOperation.type,
    );
  });

  it('fails a stalled reset after five minutes', () => {
    vi.useFakeTimers();
    try {
      const h = setup();
      h.request();
      vi.advanceTimersByTime(300_000);
      expect(h.results.at(-1)).toEqual(
        actions.cardanoContext.setWalletSyncResetResult({
          accountId,
          status: 'Failed',
          error: 'v2.account-settings.hd-wallet-sync.timeout',
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops after resume or when pending operations are cleared for the account', () => {
    const resumed = setup();
    resumed.request();
    resumed.resumed$.next();
    const cleared = setup();
    cleared.request();
    cleared.cleared$.next(
      actions.sync.clearPendingSyncsForAccounts({ accountIds: [accountId] }),
    );
    for (const h of [resumed, cleared]) {
      const count = h.results.length;
      h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
      h.failure$.next(
        actions.failures.addFailure({
          failureId: CardanoUtxoFetchFailureId(accountId),
          message: 'sync.error.cardano-utxo-fetch-failed',
        }),
      );
      expect(h.results).toHaveLength(count);
    }
  });
  it('preserves cached metadata and resets the requested account before discovery', () => {
    const h = setup();
    h.request();
    expect(h.results).toContainEqual(
      actions.cardanoContext.resetWalletSyncState({ accountId }),
    );
    expect(h.results).toContainEqual(
      actions.activities.resetActivities({ accountId }),
    );
    const discovery = h.results
      .filter(actions.sync.addSyncOperation.match)
      .at(-1)!;
    expect(discovery.payload.accountId).toBe(accountId);
    expect(discovery.payload.operation.operationId).toContain(
      'address-discovery-thorough',
    );
    expect(
      h.results.every(
        a =>
          !('payload' in a) ||
          !a.payload ||
          typeof a.payload !== 'object' ||
          !('accountId' in a.payload) ||
          a.payload.accountId !== otherId,
      ),
    ).toBe(true);
  });

  it('reports rejection without resetting pending transactions, unknown accounts, or an account already syncing', () => {
    const h = setup();
    h.request(otherId);
    h.pending$.next({
      [accountId]: [{ type: ActivityType.Pending } as Activity],
    });
    h.request();
    h.pending$.next({});
    h.status$.next({
      [accountId]: {
        pendingSync: {
          startedAt: Timestamp(1),
          operations: {
            running: {
              operationId: 'running',
              status: 'InProgress',
              type: 'Indeterminate',
              description: 'sync.operation.address-discovery',
              startedAt: Timestamp(1),
            },
          },
        },
      },
    });
    h.request();
    expect(h.results).toEqual(
      Array.from({ length: 3 }, () =>
        actions.ui.showToast({
          text: 'v2.account-settings.hd-wallet-sync.toast.error',
          color: 'negative',
          leftIcon: { name: 'Warning' },
        }),
      ),
    );
  });

  it('forces a fresh UTXO fetch after discovery and completes an empty account only after polling and UTXOs', () => {
    const h = setup();
    h.request();
    h.setUtxos();
    h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    expect(h.results).toContainEqual(
      actions.cardanoContext.refetchAccountUtxos({ accountId }),
    );
    expect(h.results.at(-1)).toEqual(
      actions.cardanoContext.refetchRewardAccountDetails({ accountId }),
    );
    h.complete(CardanoSyncOperationType.TRANSACTION_POLLING);
    h.setRewards();
    expect(
      h.results.some(
        a => a.type === actions.cardanoContext.setWalletSyncResetResult.type,
      ),
    ).toBe(false);
    h.setUtxos();
    expect(h.results.at(-1)).toEqual(
      actions.cardanoContext.setWalletSyncResetResult({
        accountId,
        status: 'Completed',
      }),
    );
    expect(h.results.at(-2)?.type).toBe(
      actions.sync.completeSyncOperation.type,
    );
  });

  it('ignores completions for other accounts and waits for activity processing', () => {
    const h = setup();
    h.request();
    h.history$.next({
      [accountId]: [{ txId: 'tx', blockTime: 1 }],
    } as unknown as CardanoAccountTransactionsHistoryMap);
    h.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    h.complete(CardanoSyncOperationType.TRANSACTION_POLLING, otherId);
    h.setUtxos(otherId);
    expect(
      h.results.some(
        a => a.type === actions.cardanoContext.setWalletSyncResetResult.type,
      ),
    ).toBe(false);
    h.complete(CardanoSyncOperationType.TRANSACTION_POLLING);
    h.setRewards();
    h.setUtxos();
    expect(
      h.results.some(
        a => a.type === actions.cardanoContext.setWalletSyncResetResult.type,
      ),
    ).toBe(false);
    h.activities$.next({
      [accountId]: [
        { activityId: 'tx', type: ActivityType.Send },
      ] as Activity[],
    });
    expect(h.results.at(-1)).toEqual(
      actions.cardanoContext.setWalletSyncResetResult({
        accountId,
        status: 'Completed',
      }),
    );
  });

  it('reports account fetch errors and stops when the account leaves the network', () => {
    const h = setup();
    h.request();
    h.failure$.next(
      actions.failures.addFailure({
        failureId: CardanoUtxoFetchFailureId(accountId),
        message: 'sync.error.cardano-utxo-fetch-failed',
      }),
    );
    expect(h.results.at(-1)).toEqual(
      actions.cardanoContext.setWalletSyncResetResult({
        accountId,
        status: 'Failed',
        error: 'sync.error.cardano-utxo-fetch-failed',
      }),
    );
    const cancelled = setup();
    cancelled.request();
    cancelled.accounts$.next([]);
    const count = cancelled.results.length;
    cancelled.complete(CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH);
    cancelled.complete(CardanoSyncOperationType.TRANSACTION_POLLING);
    cancelled.setUtxos();
    expect(cancelled.results).toHaveLength(count);
  });
});

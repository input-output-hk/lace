import { ActivityType } from '@lace-contract/activities';
import {
  BITCOIN_TOKEN_ID,
  BitcoinAddress,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import {
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  from,
  interval,
  map,
  merge,
  mergeAll,
  mergeMap,
  of,
  skip,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs';

import { BITCOIN_TOKEN_METADATA } from '../metadata';
import { BitcoinWallet, SyncStatus } from '../wallet';

import type { SideEffect } from '..';
import type { BitcoinWalletInfo } from '../common';
import type { SyncStatusUpdate } from '../wallet';
import type { ProviderError } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { AnyBlockchainAddress } from '@lace-contract/addresses';
import type {
  BitcoinBip32AccountProps,
  BitcoinBlockInfo,
  BitcoinFeeMarketProvider,
  BitcoinProvider,
  BitcoinTransactionHistoryEntry,
} from '@lace-contract/bitcoin-context';
import type { AppConfig } from '@lace-contract/module';
import type { TestnetOption } from '@lace-contract/network';
import type { Token } from '@lace-contract/tokens';
import type {
  AccountId,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Milliseconds, Result } from '@lace-sdk/util';
import type { BehaviorSubject, Observable } from 'rxjs';
import type { Logger } from 'ts-log';

const mapNetworkTypeToBitcoinNetwork = (
  networkType: InMemoryWalletAccount['networkType'],
): BitcoinNetwork => {
  switch (networkType) {
    case 'mainnet':
      return BitcoinNetwork.Mainnet;
    case 'testnet':
      return BitcoinNetwork.Testnet;
    default: {
      const _exhaustive: never = networkType;
      throw new Error(`Unhandled network type: ${String(_exhaustive)}`);
    }
  }
};

export const deriveBitcoinTestnetOptions = (
  config: AppConfig,
): TestnetOption[] => {
  const maestroConfig = (
    config.bitcoinProvider as {
      maestroConfig?: Partial<Record<BitcoinNetwork, unknown>>;
    }
  ).maestroConfig;
  const configuredNetworks = Object.keys(maestroConfig ?? {});
  const hasTestnet = configuredNetworks.includes(BitcoinNetwork.Testnet);

  if (!hasTestnet) return [];

  return [
    {
      id: BitcoinNetworkId('testnet4'),
      label: 'bitcoin.network-config.network-option.testnet4',
    },
  ];
};

export const registerBitcoinTestnetOptions: (
  testnetOptions: TestnetOption[],
) => SideEffect =
  testnetOptions =>
  (_, { network: { selectTestnetOptions$ } }, { actions }) =>
    selectTestnetOptions$.pipe(
      filter(options => !options?.Bitcoin),
      map(() =>
        actions.network.setTestnetOptions({
          blockchainName: 'Bitcoin',
          options: testnetOptions,
        }),
      ),
    );

export const registerBitcoinBlockchainNetworks: SideEffect = (
  _,
  { network: { selectBlockchainNetworks$ } },
  { actions },
) =>
  selectBlockchainNetworks$.pipe(
    filter(blockchainNetworks => !blockchainNetworks?.Bitcoin),
    map(() =>
      actions.network.setBlockchainNetworks({
        blockchain: 'Bitcoin',
        mainnet: BitcoinNetworkId('mainnet'),
        testnet: BitcoinNetworkId('testnet4'),
      }),
    ),
  );

export const mapBitcoinTxToActivity = (
  rawTx: BitcoinTransactionHistoryEntry,
  userAddresses: Set<string>,
  accountId: AccountId,
): Activity => {
  let totalInputFromUser = 0;
  let totalOutputToUser = 0;
  let hasForeignOutput = false;
  let hasOwnInputs = false;

  for (const input of rawTx.inputs) {
    if (userAddresses.has(input.address)) {
      totalInputFromUser += input.satoshis;
      hasOwnInputs = true;
    }
  }

  for (const output of rawTx.outputs) {
    if (userAddresses.has(output.address)) {
      totalOutputToUser += output.satoshis;
    } else {
      hasForeignOutput = true;
    }
  }

  const netAmount = BigInt(totalOutputToUser - totalInputFromUser);

  let activityType: ActivityType;
  if (hasOwnInputs && !hasForeignOutput) {
    activityType = ActivityType.Self;
  } else if (netAmount > 0n) {
    activityType = ActivityType.Receive;
  } else {
    activityType = ActivityType.Send;
  }

  if (rawTx.confirmations <= 0) {
    activityType = ActivityType.Pending;
  }

  return {
    accountId,
    activityId: rawTx.transactionHash,
    type: activityType,
    tokenBalanceChanges: [
      {
        tokenId: BITCOIN_TOKEN_ID,
        amount: BigNumber(netAmount),
      },
    ],
    timestamp: Timestamp(
      rawTx.timestamp > 0 ? rawTx.timestamp * 1000 : Date.now(),
    ),
  };
};

export const trackTip: (tipPollFrequency: Milliseconds) => SideEffect =
  tipPollFrequency =>
  (
    _,
    {
      bitcoinContext: { selectNetwork$ },
      wallets: { selectActiveNetworkAccounts$ },
    },
    { actions, bitcoinProvider: { getLastKnownBlock } },
  ) =>
    combineLatest([
      selectNetwork$.pipe(distinctUntilChanged()),
      selectActiveNetworkAccounts$.pipe(
        map(accounts =>
          accounts.some(account => account.blockchainName === 'Bitcoin'),
        ),
        distinctUntilChanged(),
      ),
    ]).pipe(
      switchMap(([network, hasBitcoinAccounts]) => {
        if (!network) {
          return of(actions.bitcoinContext.setTip(undefined));
        }
        if (!hasBitcoinAccounts) {
          return EMPTY;
        }
        return merge(of(void 0), interval(tipPollFrequency)).pipe(
          exhaustMap(() => getLastKnownBlock({ network })),
          mergeMap(result => {
            if (result.isErr()) {
              return of(
                actions.bitcoinContext.getTipFailed({
                  failure: result.error.reason,
                  network,
                }),
              );
            }
            return of(actions.bitcoinContext.setTip(result.value));
          }),
        );
      }),
    );

/**
 * Factory function to create and configure a new BitcoinWallet instance.
 *
 * @param historyDepth The depth of transaction history to maintain.
 * @param requestResync$ Observable that triggers wallet resynchronization.
 * @param selectNetwork$ Observable providing the current Bitcoin network (undefined when not yet registered).
 * @param selectTip$ Observable providing the current blockchain tip.
 * @param bitcoinAccountWallets$ Observable holding the mapping of account IDs to BitcoinWallet instances.
 * @param provider The Bitcoin data provider.
 * @param feeMarketProvider The provider for fee market estimations.
 * @param account The in-memory wallet account data.
 * @param logger
 * @returns An object containing observables for the wallet's tokens and addresses.
 */
export const createBitcoinWallet = ({
  historyDepth,
  requestResync$,
  selectNetwork$,
  selectTip$,
  bitcoinAccountWallets$,
  provider,
  feeMarketProvider,
  account,
  logger,
}: {
  historyDepth: number;
  requestResync$: Observable<{
    type: string;
    payload: { accountId: AccountId };
  }>;
  selectNetwork$: Observable<BitcoinNetwork | undefined>;
  selectTip$: Observable<BitcoinBlockInfo | undefined>;
  bitcoinAccountWallets$: BehaviorSubject<Record<string, BitcoinWallet>>;
  provider: BitcoinProvider;
  feeMarketProvider: BitcoinFeeMarketProvider;
  account: InMemoryWalletAccount<BitcoinBip32AccountProps>;
  logger: Logger;
}): {
  tokens$: Observable<{ address: string; tokens: Token[] }>;
  addresses$: Observable<AnyBlockchainAddress[]>;
  syncStatus$: Observable<SyncStatusUpdate>;
  activities$: Observable<Activity[]>;
  fetchTxHistoryUpTo: (
    desiredAmount: number,
  ) => Observable<Result<boolean, ProviderError>>;
} => {
  const walletInfo: BitcoinWalletInfo = {
    accountIndex: account.blockchainSpecific.accountIndex,
    extendedAccountPublicKeys:
      account.blockchainSpecific.extendedAccountPublicKeys,
    network: mapNetworkTypeToBitcoinNetwork(account.networkType),
    walletId: account.walletId,
  };

  const resyncController$ = requestResync$.pipe(
    filter(({ payload: { accountId } }) => accountId === account.accountId),
  );

  const pollController$ = combineLatest([selectTip$, selectNetwork$]).pipe(
    filter(
      ([tip, currentNetwork]) => !!tip && currentNetwork === walletInfo.network,
    ),
    map(([tip]) => tip as BitcoinBlockInfo),
  );

  const wallet = new BitcoinWallet(
    provider,
    feeMarketProvider,
    historyDepth,
    walletInfo,
    pollController$,
    resyncController$,
    logger,
  );

  const currentWallets = bitcoinAccountWallets$.value;
  bitcoinAccountWallets$.next({
    ...currentWallets,
    [account.accountId]: wallet,
  });

  return {
    addresses$: wallet.addresses$.pipe(
      map(derivedAddresses =>
        derivedAddresses.map(derivedAddr => ({
          address: derivedAddr.address as BitcoinAddress,
          accountId: account.accountId,
          data: { network: derivedAddr.network },
        })),
      ),
    ),

    tokens$: combineLatest([wallet.addresses$, wallet.balance$]).pipe(
      map(([addresses, balance]) => {
        const primaryAddress = addresses[0]?.address || '';

        const btcToken: Token = {
          metadata: BITCOIN_TOKEN_METADATA,
          accountId: account.accountId,
          address: BitcoinAddress(primaryAddress),
          tokenId: BITCOIN_TOKEN_ID,
          available: BigNumber(BigInt(balance)),
          pending: BigNumber(BigInt(0)), // Compute from pending TXs
          decimals: 8, // BTC has 8 decimal places (satoshis)
          displayDecimalPlaces: 8,
          displayLongName: 'Bitcoin',
          displayShortName: 'BTC',
          blockchainName: 'Bitcoin',
        };

        return {
          address: BitcoinAddress(primaryAddress),
          tokens: [btcToken],
        };
      }),
    ),
    syncStatus$: wallet.syncStatus$,
    activities$: combineLatest([
      wallet.transactionHistory$,
      wallet.pendingTransactions$,
      wallet.addresses$,
    ]).pipe(
      map(([rawTxs, pendingTxs, derivedAddresses]) => {
        const userAddresses = new Set(derivedAddresses.map(a => a.address));
        return [...pendingTxs, ...rawTxs].map(rawTx =>
          mapBitcoinTxToActivity(rawTx, userAddresses, account.accountId),
        );
      }),
    ),

    fetchTxHistoryUpTo: (desiredCount: number) => {
      return wallet.fetchTxHistoryUpTo(desiredCount);
    },
  };
};

const startBitcoinWallet: (historyDepth: number) => SideEffect =
  historyDepth =>
  (
    { bitcoinContext: { requestResync$, getTipFailed$ } },
    {
      bitcoinContext: { selectTip$, selectNetwork$ },
      wallets: { selectActiveNetworkAccounts$ },
      activities: {
        selectDesiredLoadedActivitiesCountPerAccount$,
        selectAllMap$,
      },
    },
    {
      bitcoinProvider,
      bitcoinAccountWallets$,
      bitcoinFeeMarketProvider,
      actions,
      logger,
    },
  ) =>
    selectActiveNetworkAccounts$.pipe(
      map(accounts =>
        accounts.filter(
          (
            account,
          ): account is InMemoryWalletAccount<BitcoinBip32AccountProps> =>
            account.blockchainName === 'Bitcoin',
        ),
      ),
      mergeAll(),
      mergeMap(bitcoinAccount => {
        const bitcoinWallet = createBitcoinWallet({
          historyDepth,
          requestResync$,
          selectNetwork$,
          selectTip$,
          bitcoinAccountWallets$,
          provider: bitcoinProvider,
          feeMarketProvider: bitcoinFeeMarketProvider,
          account: bitcoinAccount,
          logger,
        });

        const upsertBtcMetadataOnce$ = selectActiveNetworkAccounts$.pipe(
          take(1),
          map(() =>
            actions.tokens.upsertTokensMetadata({
              metadatas: [
                {
                  ...BITCOIN_TOKEN_METADATA,
                  tokenId: BITCOIN_TOKEN_ID,
                },
              ],
            }),
          ),
        );

        return merge(
          upsertBtcMetadataOnce$,
          bitcoinWallet.addresses$.pipe(
            map(addresses => {
              return actions.addresses.upsertAddresses({
                accountId: bitcoinAccount.accountId,
                addresses,
                blockchainName: 'Bitcoin',
              });
            }),
          ),
          bitcoinWallet.syncStatus$.pipe(
            map(update => {
              const operationId = `${bitcoinAccount.accountId}-bitcoin-sync`;
              switch (update.status) {
                case SyncStatus.Pending: {
                  return actions.sync.addSyncOperation({
                    accountId: bitcoinAccount.accountId,
                    operation: {
                      operationId,
                      status: 'Pending',
                      description: 'sync.operation.bitcoin-wallet-sync',
                      startedAt: Timestamp(update.lastUpdate),
                    },
                  });
                }
                case SyncStatus.Syncing: {
                  return actions.sync.addSyncOperation({
                    accountId: bitcoinAccount.accountId,
                    operation: {
                      operationId,
                      status: 'InProgress',
                      type: 'Indeterminate',
                      description: 'sync.operation.bitcoin-wallet-sync',
                      startedAt: Timestamp(update.lastUpdate),
                    },
                  });
                }
                case SyncStatus.Synced: {
                  return actions.sync.completeSyncOperation({
                    accountId: bitcoinAccount.accountId,
                    operationId,
                  });
                }
                case SyncStatus.Error: {
                  return actions.sync.failSyncOperation({
                    accountId: bitcoinAccount.accountId,
                    operationId,
                    error: 'sync.error.bitcoin-sync-failed',
                  });
                }
              }
            }),
          ),
          // Fail the pending sync operation so the UI stops showing a loading state.
          getTipFailed$.pipe(
            withLatestFrom(selectNetwork$),
            filter(
              ([{ payload }, currentNetwork]) =>
                payload.network === currentNetwork,
            ),
            withLatestFrom(bitcoinWallet.syncStatus$),
            filter(
              ([, walletStatus]) => walletStatus.status === SyncStatus.Syncing,
            ),
            map(() =>
              actions.sync.failSyncOperation({
                accountId: bitcoinAccount.accountId,
                operationId: `${bitcoinAccount.accountId}-bitcoin-sync`,
                error: 'sync.error.bitcoin-sync-failed',
              }),
            ),
          ),
          bitcoinWallet.tokens$.pipe(
            // Skip the initial BehaviorSubject emission (zero balance)
            // to preserve persisted token data until real sync completes.
            skip(1),
            map(({ address, tokens }) => {
              return actions.tokens.setAddressTokens({
                accountId: bitcoinAccount.accountId,
                address: BitcoinAddress(address),
                tokens,
                blockchainName: 'Bitcoin',
              });
            }),
          ),
          bitcoinWallet.activities$.pipe(
            map(activities => {
              return actions.activities.upsertActivities({
                accountId: bitcoinAccount.accountId,
                activities,
              });
            }),
          ),
          selectDesiredLoadedActivitiesCountPerAccount$.pipe(
            mergeMap(desiredCountMap => from(Object.entries(desiredCountMap))),
            filter(([accountId]) => accountId === bitcoinAccount.accountId),
            withLatestFrom(selectAllMap$),
            filter(([[, desiredCount], loadedActivities]) => {
              const currentCount =
                loadedActivities[bitcoinAccount.accountId]?.length ?? 0;
              return currentCount < desiredCount;
            }),
            switchMap(([[, desiredAmount]]) =>
              bitcoinWallet.fetchTxHistoryUpTo(desiredAmount),
            ),
            mergeMap((result: Result<boolean, ProviderError>) => {
              if (result.isErr()) {
                return of(
                  actions.bitcoinContext.getAddressTransactionHistoryFailed({
                    accountId: bitcoinAccount.accountId,
                    failure: result.error.reason,
                  }),
                );
              }

              const hasReachedEnd = result.value;

              if (hasReachedEnd) {
                return of(
                  actions.activities.setHasLoadedOldestEntry({
                    accountId: bitcoinAccount.accountId,
                    hasLoadedOldestEntry: true,
                  }),
                );
              }

              return EMPTY;
            }),
          ),
        );
      }),
    );

export const createBitcoinProviderSideEffects = (config: AppConfig) => {
  const testnetOptions = deriveBitcoinTestnetOptions(config);
  return [
    registerBitcoinBlockchainNetworks,
    registerBitcoinTestnetOptions(testnetOptions),
    startBitcoinWallet(config.bitcoinProvider.historyDepth),
    trackTip(config.bitcoinProvider.tipPollFrequency),
  ];
};

import * as ecc from '@bitcoinerlab/secp256k1';
import {
  BitcoinNetwork,
  type BitcoinProvider,
} from '@lace-contract/bitcoin-context';
import { Err, Ok } from '@lace-sdk/util';
import * as bitcoin from 'bitcoinjs-lib';
import isEqual from 'lodash/isEqual';
import {
  BehaviorSubject,
  EMPTY,
  expand,
  finalize,
  forkJoin,
  from,
  mergeMap,
  of,
  tap,
  withLatestFrom,
  last,
  defaultIfEmpty,
  merge,
} from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import {
  AddressType,
  ChainType,
  deriveAddressByType,
  deriveChildPublicKey,
} from '../common';
import { historyEntryFromRawTx } from '../tx-builder/utils';

import { BlockchainInputResolver } from './../providers';

import type { BitcoinWalletInfo, DerivedAddress } from '../common';
import type { InputResolver } from './../providers';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  BitcoinEstimatedFees,
  BitcoinFeeMarketProvider,
  BitcoinTransactionHistoryEntry,
  BitcoinBlockInfo,
  BitcoinUTxO,
  BitcoinInputEntry,
} from '@lace-contract/bitcoin-context';
import type { Result } from '@lace-sdk/util';
import type { Observable, Subscription } from 'rxjs';
import type { Logger } from 'ts-log';

bitcoin.initEccLib(ecc);

export enum SyncStatus {
  Pending = 'pending',
  Syncing = 'syncing',
  Synced = 'synced',
  Error = 'error',
}

export type SyncStatusUpdate = {
  status: SyncStatus;
  lastUpdate: number; // timestamp in milliseconds
  lastError?: ProviderError;
};

export class BitcoinWallet {
  public syncStatus$: BehaviorSubject<SyncStatusUpdate> =
    new BehaviorSubject<SyncStatusUpdate>({
      status: SyncStatus.Syncing,
      lastUpdate: Date.now(),
    });
  public transactionHistory$: BehaviorSubject<
    BitcoinTransactionHistoryEntry[]
  > = new BehaviorSubject(new Array<BitcoinTransactionHistoryEntry>());
  public pendingTransactions$: BehaviorSubject<
    BitcoinTransactionHistoryEntry[]
  > = new BehaviorSubject(new Array<BitcoinTransactionHistoryEntry>());
  public utxos$: BehaviorSubject<BitcoinUTxO[]> = new BehaviorSubject(
    new Array<BitcoinUTxO>(),
  );
  public balance$: BehaviorSubject<number> = new BehaviorSubject(0);
  public addresses$: BehaviorSubject<DerivedAddress[]> = new BehaviorSubject(
    new Array<DerivedAddress>(),
  );
  public isLoadingHistory$ = new BehaviorSubject<boolean>(false);
  public readonly network: BitcoinNetwork;
  public readonly address: DerivedAddress;

  private readonly nextCursor$ = new BehaviorSubject<string | null | undefined>(
    undefined,
  );
  private pollSubscription: Subscription | null = null;
  private lastKnownBlock: BitcoinBlockInfo | null = null;
  private readonly historyDepth: number;
  private readonly provider: BitcoinProvider;
  private readonly info: BitcoinWalletInfo;
  private readonly pollController$: Observable<BitcoinBlockInfo>;
  private readonly requestResync$: Observable<unknown>;
  private readonly logger: Logger;
  private readonly inputResolver: InputResolver;
  private readonly feeMarketProvider: BitcoinFeeMarketProvider;

  // eslint-disable-next-line max-params
  public constructor(
    provider: BitcoinProvider,
    feeMarketProvider: BitcoinFeeMarketProvider,
    historyDepth = 20,
    info: BitcoinWalletInfo,
    pollController$: Observable<BitcoinBlockInfo>,
    requestResync$: Observable<unknown>,
    logger: Logger,
  ) {
    const bitcoinNetwork =
      info.network === BitcoinNetwork.Mainnet
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    this.pollController$ = pollController$;
    this.requestResync$ = requestResync$;
    this.logger = logger;
    this.network = info.network;
    this.historyDepth = historyDepth;
    this.provider = provider;
    this.info = info;

    // TODO: Allow this to be injected.
    this.inputResolver = new BlockchainInputResolver(provider, this.network);
    this.feeMarketProvider = feeMarketProvider;

    const networkKeys = info.extendedAccountPublicKeys;
    const extendedAccountPubKey = networkKeys.nativeSegWit;
    const pubKey = deriveChildPublicKey(
      extendedAccountPubKey,
      ChainType.External,
      0,
    );
    const address = deriveAddressByType(
      pubKey,
      AddressType.NativeSegWit,
      bitcoinNetwork,
    );

    this.address = {
      address,
      addressType: AddressType.NativeSegWit,
      network: info.network,
      account: this.info.accountIndex,
      chain: ChainType.External,
      index: 0,
      publicKeyHex: Buffer.from(pubKey).toString('hex'),
    };

    this.addresses$.next([this.address]);
    this.startPolling();

    this.utxos$
      .pipe(
        map(utxos => utxos.reduce((total, utxo) => total + utxo.satoshis, 0)),
      )
      .subscribe(balance => {
        this.balance$.next(balance);
      });
  }

  public getInfo(): Observable<Result<BitcoinWalletInfo, ProviderError>> {
    return of(Ok(this.info));
  }

  public getNetwork(): Observable<Result<BitcoinNetwork, ProviderError>> {
    return of(Ok(this.network));
  }

  public getAddress(): Observable<Result<DerivedAddress, ProviderError>> {
    return of(Ok(this.address));
  }

  /**
   * Fetches the current fee market for estimating transaction fees.
   */
  public getCurrentFeeMarket(): Observable<
    Result<BitcoinEstimatedFees, ProviderError>
  > {
    return this.feeMarketProvider.getFeeMarket({ network: this.network });
  }

  /**
   * Fetches transaction history pages recursively until the total number of
   * transactions reaches the `desiredAmount` or the end of history is found.
   *
   * @param desiredAmount The target number of transactions to have loaded.
   * @returns An observable that emits an `Ok<boolean>` on success or an `Err<ProviderError>` on failure.
   * The boolean is `true` if the end of history was reached.
   */
  public fetchTxHistoryUpTo(
    desiredAmount: number,
  ): Observable<Result<boolean, ProviderError>> {
    if (this.isLoadingHistory$.value) {
      this.logger.debug(
        'History loading already in progress. Skipping request.',
      );
      return of(Ok(false));
    }

    this.isLoadingHistory$.next(true);

    return of(this.nextCursor$.value).pipe(
      expand(cursor => {
        if (
          this.transactionHistory$.value.length >= desiredAmount ||
          cursor === null
        ) {
          return EMPTY;
        }

        return this.provider
          .getTransactions({ network: this.network }, this.address.address, {
            cursor,
            limit: this.historyDepth,
            order: 'desc',
          })
          .pipe(
            map(result => {
              if (result.isErr()) {
                this.logger.error(
                  'Failed to get older transactions:',
                  result.error,
                );
                throw result.error;
              }
              const { items: olderHistory, cursor: nextCursor } = result.value;
              const uniqueHistory = Array.from(
                new Map(
                  [...this.transactionHistory$.value, ...olderHistory].map(
                    tx => [tx.transactionHash, tx] as const,
                  ),
                ).values(),
              );
              this.transactionHistory$.next(uniqueHistory);
              this.nextCursor$.next(nextCursor || null);

              return nextCursor || null;
            }),
          );
      }),
      defaultIfEmpty(this.nextCursor$.value),
      last(),
      map(lastCursor => lastCursor === null),
      map(hasReachedEnd => Ok(hasReachedEnd)),
      catchError((error: ProviderError) => {
        this.logger.error(
          'A critical error occurred during history fetch:',
          error,
        );
        return of(Err(error));
      }),
      finalize(() => {
        this.isLoadingHistory$.next(false);
      }),
    );
  }

  /**
   * Submits a raw transaction to the blockchain for inclusion in a block.
   *
   * @param rawTransaction - The raw transaction data to be broadcast to the network.
   */
  public submitTransaction(
    rawTransaction: string,
  ): Observable<Result<string, ProviderError>> {
    return this.provider
      .submitTransaction({ network: this.network }, rawTransaction)
      .pipe(
        mergeMap((submitResult: Result<string, ProviderError>) => {
          if (submitResult.isErr()) {
            return of(submitResult);
          }

          const transactionId = submitResult.value;

          return from(
            historyEntryFromRawTx(
              rawTransaction,
              this.network,
              this.inputResolver,
            ),
          ).pipe(
            tap(entry => {
              entry.transactionHash = transactionId;

              const isAlreadyPending = this.pendingTransactions$.value.some(
                tx => tx.transactionHash === entry.transactionHash,
              );

              if (!isAlreadyPending) {
                this.pendingTransactions$.next([
                  ...this.pendingTransactions$.value,
                  entry,
                ]);
              }
            }),
            map(() => submitResult),
          );
        }),
        catchError((error: ProviderError) => {
          this.logger.error('Failed to submit transaction:', error);
          return of(Err(error));
        }),
      );
  }

  /**
   * Stop polling by unsubscribing from the subscription
   */
  public shutdown() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }
  }

  /**
   * Starts reacting to tip changes and updating wallet state.
   * The polling controller is responsible for *when* we trigger,
   * this method just reacts to those triggers.
   */
  private startPolling() {
    type SyncTrigger =
      | { type: 'manual'; tip: BitcoinBlockInfo }
      | { type: 'tip'; tip: BitcoinBlockInfo };

    const tip$ = this.pollController$.pipe(
      map<BitcoinBlockInfo, SyncTrigger>(tip => ({ type: 'tip', tip })),
    );

    const manual$ = this.requestResync$.pipe(
      withLatestFrom(this.pollController$),
      map(([, tip]) => ({ type: 'manual', tip } as SyncTrigger)),
    );

    this.pollSubscription = merge(tip$, manual$)
      .pipe(
        tap(event => {
          this.updateSyncStatus(SyncStatus.Pending);

          this.logger.debug(
            event.type === 'tip'
              ? `Poll triggered by tip ${event.tip.hash} at height ${event.tip.height}`
              : `Manual resync triggered at tip ${event.tip.hash} (height ${event.tip.height})`,
          );
        }),
        switchMap(event => {
          const latestBlockInfo = event.tip;

          let task$: Observable<void>;

          if (event.type === 'tip') {
            const hasNewBlock =
              !this.lastKnownBlock ||
              this.lastKnownBlock.hash !== latestBlockInfo.hash;

            task$ = hasNewBlock
              ? this.updateState(latestBlockInfo)
              : this.updatePendingTransactions();
          } else {
            task$ = this.updateState(latestBlockInfo);
          }

          this.updateSyncStatus(SyncStatus.Syncing);

          return task$.pipe(
            tap(() => {
              this.updateSyncStatus(SyncStatus.Synced);
            }),
            catchError((error: ProviderError) => {
              this.logger.error('Failed to update wallet state:', error);
              this.updateSyncStatus(SyncStatus.Error, error);
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe();
  }

  /**
   * Fetches the latest transactions and updates the transactionHistory$ subject if they have changed.
   */
  private updateTransactions(): Observable<boolean> {
    return this.provider
      .getTransactions({ network: this.network }, this.address.address, {
        limit: this.historyDepth,
        order: 'desc',
      })
      .pipe(
        map(result => {
          if (result.isErr()) {
            this.logger.error('Failed to get transactions:', result.error);
            throw result.error;
          }

          const { items: newHistory, cursor: nextCursor } = result.value;
          const currentHistory = this.transactionHistory$.value;

          const combinedHistory = [...newHistory, ...currentHistory];

          const uniqueHistory = Array.from(
            new Map(
              combinedHistory.map(tx => [tx.transactionHash, tx]),
            ).values(),
          );

          uniqueHistory.sort((a, b) => b.timestamp - a.timestamp);

          const hasSetChanged = !isEqual(uniqueHistory, currentHistory);

          if (hasSetChanged) {
            this.transactionHistory$.next(uniqueHistory);
          }

          if (this.nextCursor$.value === undefined) {
            this.nextCursor$.next(nextCursor || null);
          }

          return hasSetChanged;
        }),
      );
  }

  /**
   * Updates the local list of pending transactions by synchronizing with the remote mempool.
   *
   * Transactions in the Bitcoin network can be replaced in the mempool by another transaction
   * with the same inputs but possibly with a higher fee (Replace-By-Fee, RBF).
   *
   * The method performs the following operations:
   *
   * 1. **Fetch Remote Pending Transactions**: Retrieves the list of pending transactions from the mempool
   *    for the wallet's address. This includes transactions that are waiting to be confirmed.
   *
   * 2. **Synchronize Local and Remote Transactions**:
   *    - For each remote pending transaction:
   *      - If it matches a transaction in the local list (by transaction hash), it updates the local transaction
   *        with the remote version, since it contains more metadata (I.E resolved inputs).
   *
   * 3. **Purge Invalid Local Transactions**:
   *    - Iterates over the local list of pending transactions to check each transaction's inputs against:
   *      a. Inputs of all other transactions in the transaction history to detect if any inputs have been confirmed in a block.
   *      b. Inputs of other remote pending transactions to handle RBF scenarios where a transaction might be replaced
   *         by another with the same inputs but not the same hash.
   *    - Removes any local transactions whose inputs are found in the confirmed transactions or in another competing pending transaction.
   */
  private updatePendingTransactions(): Observable<void> {
    return this.provider
      .getTransactionsInMempool(
        { network: this.network },
        this.address.address,
        { order: 'desc' },
      )
      .pipe(
        withLatestFrom(this.pendingTransactions$),
        tap(([mempoolResult, localPendingTxs]) => {
          if (mempoolResult.isErr()) {
            this.logger.error(
              'Failed to get mempool transactions:',
              mempoolResult.error,
            );
            throw mempoolResult.error;
          }

          const { items: remotePendingTxs } = mempoolResult.value;

          const validLocalTxs = localPendingTxs.filter(localTx => {
            const isSpent = localTx.inputs.some(
              input =>
                this.isInputSpent(input, this.transactionHistory$.value) ||
                this.isInputSpent(
                  input,
                  remotePendingTxs.filter(
                    remoteTx =>
                      remoteTx.transactionHash !== localTx.transactionHash,
                  ),
                ),
            );
            return !isSpent;
          });

          const finalTxsMap = new Map<string, BitcoinTransactionHistoryEntry>(
            validLocalTxs.map(tx => [tx.transactionHash, tx]),
          );

          remotePendingTxs.forEach(remoteTx => {
            finalTxsMap.set(remoteTx.transactionHash, remoteTx);
          });

          let newPendingTxs = Array.from(finalTxsMap.values());

          const confirmedHashes = new Set(
            this.transactionHistory$.value.map(tx => tx.transactionHash),
          );

          newPendingTxs = newPendingTxs.filter(
            tx => !confirmedHashes.has(tx.transactionHash),
          );

          if (!isEqual(newPendingTxs, this.pendingTransactions$.value)) {
            this.pendingTransactions$.next(newPendingTxs);
          }
        }),
        map(() => undefined),
      );
  }

  /**
   * Helper method to check if a specific transaction input has been used
   * in a given list of transactions.
   */
  private isInputSpent(
    inputToFind: BitcoinInputEntry,
    transactionList: BitcoinTransactionHistoryEntry[],
  ): boolean {
    return transactionList.some(tx =>
      tx.inputs.some(
        input =>
          input.txId === inputToFind.txId && input.index === inputToFind.index,
      ),
    );
  }

  /**
   * Fetches the latest UTxOs and updates the utxos$ subject if they have changed.
   * Returns a cold observable that completes when the operation is done.
   */
  private updateUtxos(): Observable<void> {
    return this.provider
      .getUTxOs({ network: this.network }, this.address.address, {})
      .pipe(
        withLatestFrom(this.utxos$),
        tap(([utxoResult, currentUtxos]) => {
          if (utxoResult.isErr()) {
            this.logger.error('Failed to get UTxOs:', utxoResult.error);
            throw utxoResult.error;
          }

          const { items } = utxoResult.value;

          if (!isEqual(items, currentUtxos)) {
            this.utxos$.next(items);
          }
        }),
        map(() => undefined),
      );
  }

  /**
   * Updates the entire wallet state.
   * It chains the various update operations in the correct order.
   */
  private updateState(latestBlockInfo: BitcoinBlockInfo): Observable<void> {
    return this.updateTransactions().pipe(
      mergeMap((hasTxSetChanged: boolean) => {
        const tasksToRun: Observable<void>[] = [
          this.updatePendingTransactions(),
        ];

        if (hasTxSetChanged) {
          tasksToRun.push(this.updateUtxos());
        }

        return forkJoin(tasksToRun);
      }),
      tap(() => {
        this.lastKnownBlock = latestBlockInfo;
      }),
      map(() => undefined),
    );
  }

  private updateSyncStatus(
    status: SyncStatus,
    lastError?: ProviderError,
  ): void {
    this.syncStatus$.next({
      status,
      lastUpdate: Date.now(),
      lastError,
    });
  }
}

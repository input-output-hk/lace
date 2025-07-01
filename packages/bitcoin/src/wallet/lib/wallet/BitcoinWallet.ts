/* eslint-disable no-magic-numbers, unicorn/no-null, unicorn/prefer-array-some, @typescript-eslint/explicit-module-boundary-types */
import {
  BlockchainDataProvider,
  BlockchainInputResolver,
  BlockInfo,
  InputResolver,
  TransactionHistoryEntry,
  UTxO
} from './../providers';
import { BehaviorSubject, combineLatest, filter, interval, Observable, of, startWith, Subscription, tap } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  AddressType,
  BitcoinWalletInfo,
  ChainType,
  deriveAddressByType,
  deriveChildPublicKey,
  DerivedAddress,
  getNetworkKeys,
  Network
} from '../common';
import { Logger } from 'ts-log';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import isEqual from 'lodash/isEqual';
import { historyEntryFromRawTx } from '../tx-builder/utils';
import { FeeMarketProvider } from './FeeMarketProvider';

bitcoin.initEccLib(ecc);

/**
 * Represents the fee market for estimating transaction fees.
 */
export type FeeMarket = {
  /**
   * The fee rate in satoshis per byte.
   */
  feeRate: number;

  /**
   * The confirmation target time in seconds.
   * This represents the estimated time within which the transaction is expected to be confirmed.
   */
  targetConfirmationTime: number;
};

/**
 * Represents the estimated fees for different transaction speeds.
 *
 * The estimated fees are categorized into three tiers: `fast`, `standard`, and `slow`.
 * Each tier includes the fee rate (in satoshis per byte) and the expected confirmation
 * time (in seconds).
 */
export type EstimatedFees = {
  /**
   * Fast tier: The fee and confirmation time for transactions requiring
   * high priority and the fastest possible confirmation.
   */
  fast: FeeMarket;

  /**
   * Standard tier: The fee and confirmation time for transactions with
   * average priority, balancing cost and confirmation speed.
   */
  standard: FeeMarket;

  /**
   * Slow tier: The fee and confirmation time for transactions with
   * low priority, suitable for non-urgent transfers.
   */
  slow: FeeMarket;
};

export interface SyncStatus {
  isAnyRequestPending$: Observable<boolean>;
  isUpToDate$: Observable<boolean>;
  isSettled$: Observable<boolean>;
  shutdown(): void;
}

export class BitcoinWallet {
  private pollSubscription: Subscription | null = null;
  private lastKnownBlock: BlockInfo | null = null;
  private transactionHistory: TransactionHistoryEntry[] = [];
  private readonly pollInterval: number;
  private readonly historyDepth: number;
  private provider: BlockchainDataProvider;
  private info: BitcoinWalletInfo;
  private network: Network;
  private address: DerivedAddress;
  private pollController$: Observable<boolean>;
  private logger: Logger;
  private inputResolver: InputResolver;
  private readonly feeMarketProvider: FeeMarketProvider;

  public syncStatus: SyncStatus;

  public transactionHistory$: BehaviorSubject<TransactionHistoryEntry[]> = new BehaviorSubject(
    new Array<TransactionHistoryEntry>()
  );
  public pendingTransactions$: BehaviorSubject<TransactionHistoryEntry[]> = new BehaviorSubject(
    new Array<TransactionHistoryEntry>()
  );
  public utxos$: BehaviorSubject<UTxO[]> = new BehaviorSubject(new Array<UTxO>());
  public balance$: BehaviorSubject<bigint> = new BehaviorSubject(BigInt(0));
  public addresses$: BehaviorSubject<DerivedAddress[]> = new BehaviorSubject(new Array<DerivedAddress>());

  // eslint-disable-next-line max-params
  constructor(
    provider: BlockchainDataProvider,
    feeMarketProvider: FeeMarketProvider,
    pollInterval = 30_000,
    historyDepth = 20,
    info: BitcoinWalletInfo,
    network: Network = Network.Testnet,
    pollController$: Observable<boolean>,
    logger: Logger
  ) {
    const bitcoinNetwork = network === Network.Mainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    this.pollController$ = pollController$;
    this.logger = logger;
    this.network = network;
    this.pollInterval = pollInterval;
    this.historyDepth = historyDepth;
    this.provider = provider;
    this.info = info;
    this.syncStatus = {
      // TODO: Track actual sync status
      isAnyRequestPending$: of(false),
      isUpToDate$: of(true),
      isSettled$: of(true),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      shutdown: () => {}
    };

    // TODO: Allow this to be injected.
    this.inputResolver = new BlockchainInputResolver(provider);
    this.feeMarketProvider = feeMarketProvider;

    const networkKeys = getNetworkKeys(info, network);
    const extendedAccountPubKey = networkKeys.nativeSegWit;
    const pubKey = deriveChildPublicKey(extendedAccountPubKey, ChainType.External, 0);
    const address = deriveAddressByType(pubKey, AddressType.NativeSegWit, bitcoinNetwork);

    this.address = {
      address,
      addressType: AddressType.NativeSegWit,
      network,
      account: this.info.accountIndex,
      chain: ChainType.External,
      index: 0,
      publicKeyHex: Buffer.from(pubKey).toString('hex')
    };

    this.addresses$.next([this.address]);
    this.startPolling();

    this.utxos$
      .pipe(map((utxos) => utxos.reduce((total, utxo) => total + utxo.satoshis, BigInt(0))))
      .subscribe((balance) => {
        this.balance$.next(balance);
      });
  }

  public async getInfo(): Promise<BitcoinWalletInfo> {
    return this.info;
  }

  public async getNetwork(): Promise<Network> {
    return this.network;
  }

  public async getAddress(): Promise<DerivedAddress> {
    return this.address;
  }

  /**
   * Fetches the current fee market for estimating transaction fees.
   */
  public async getCurrentFeeMarket(): Promise<EstimatedFees> {
    return this.feeMarketProvider.getFeeMarket();
  }

  /**
   * Submits a raw transaction to the blockchain for inclusion in a block.
   *
   * @param rawTransaction - The raw transaction data to be broadcast to the network.
   */
  public async submitTransaction(rawTransaction: string): Promise<string> {
    try {
      const transactionId = await this.provider.submitTransaction(rawTransaction);
      const entry = await historyEntryFromRawTx(rawTransaction, this.network, this.inputResolver);
      entry.transactionHash = transactionId;

      // Add to pending transactions if not already present
      if (!this.pendingTransactions$.value.find((tx) => tx.transactionHash === entry.transactionHash)) {
        this.pendingTransactions$.next([...this.pendingTransactions$.value, entry]);
      }

      return transactionId;
    } catch (error) {
      this.logger.error('Failed to submit transaction:', error);
      throw error;
    }
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
   * Starts polling for new blocks and updating wallet state.
   */
  private startPolling() {
    this.pollSubscription = combineLatest([interval(this.pollInterval).pipe(startWith(0)), this.pollController$])
      .pipe(
        tap(([intervalVal, pollAllowed]) =>
          this.logger.debug(`Poll Interval tick: ${intervalVal}, Poll Allowed: ${pollAllowed}`)
        ),
        filter(([, pollAllowed]) => pollAllowed),
        switchMap(() => this.provider.getLastKnownBlock()),
        catchError((error) => {
          this.logger.error('Failed to fetch blockchain info during polling:', error);
          return of(null);
        })
      )
      .subscribe(async (latestBlockInfo: BlockInfo | null) => {
        if (!latestBlockInfo) return;

        try {
          await (!this.lastKnownBlock || this.lastKnownBlock.hash !== latestBlockInfo.hash
            ? this.updateState(latestBlockInfo)
            : this.updatePendingTransactions());
        } catch (error) {
          this.logger.error('Failed to update wallet state:', error);
        }
      });
  }

  private async updateTransactions(): Promise<boolean> {
    const { transactions } = await this.provider.getTransactions(this.address.address, 0, this.historyDepth);

    const txSetChanged = !isEqual(transactions, this.transactionHistory);

    if (txSetChanged) {
      this.transactionHistory = transactions;
      this.transactionHistory$.next(this.transactionHistory);
    }

    return txSetChanged;
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
  private async updatePendingTransactions() {
    const remotePendingTxs = await this.provider.getTransactionsInMempool(
      this.address.address,
      this.lastKnownBlock?.height ?? 0
    );
    const updatedPendingTxs = [...this.pendingTransactions$.value];

    const filteredPendingTxs = updatedPendingTxs.filter((localTx) => {
      const inputUsedInHistory = this.transactionHistory.some((historyTx) =>
        historyTx.inputs.some((histInput) =>
          localTx.inputs.some(
            (localInput) => histInput.txId === localInput.txId && histInput.index === localInput.index
          )
        )
      );

      const inputUsedInRemotePending = remotePendingTxs.some(
        (remoteTx) =>
          remoteTx.transactionHash !== localTx.transactionHash &&
          remoteTx.inputs.some((remoteInput) =>
            localTx.inputs.some(
              (localInput) => remoteInput.txId === localInput.txId && remoteInput.index === localInput.index
            )
          )
      );

      return !(inputUsedInHistory || inputUsedInRemotePending);
    });

    remotePendingTxs.forEach((remoteTx) => {
      const index = filteredPendingTxs.findIndex((t) => t.transactionHash === remoteTx.transactionHash);
      if (index > -1) filteredPendingTxs[index] = remoteTx;
      else filteredPendingTxs.push(remoteTx);
    });

    if (!isEqual(filteredPendingTxs, this.pendingTransactions$.value)) {
      this.pendingTransactions$.next(filteredPendingTxs);
    }
  }

  private async updateUtxos() {
    const newUtxos = await this.provider.getUTxOs(this.address.address);

    if (!isEqual(newUtxos, this.utxos$.value)) {
      this.utxos$.next(newUtxos);
    }
  }

  /**
   * Updates the wallet state by fetching new transactions and UTxOs.
   */
  private async updateState(latestBlockInfo: BlockInfo): Promise<void> {
    this.lastKnownBlock = latestBlockInfo;

    const txSetChanged = await this.updateTransactions();
    await this.updatePendingTransactions();

    if (txSetChanged) {
      await this.updateUtxos();
    }

    this.lastKnownBlock = latestBlockInfo;
  }
}

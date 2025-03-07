import {BlockchainDataProvider, BlockInfo, FeeEstimationMode, TransactionHistoryEntry, UTxO} from './../providers';
import {BehaviorSubject, interval, of, startWith, Subscription} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {
  AddressType,
  BitcoinWalletInfo, ChainType,
  deriveAddressByType,
  deriveChildPublicKey,
  DerivedAddress,
  getNetworkKeys,
  Network
} from '../common';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import isEqual from 'lodash/isEqual';

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

  public transactionHistory$: BehaviorSubject<TransactionHistoryEntry[]> = new BehaviorSubject(new Array<TransactionHistoryEntry>());
  public pendingTransactions$: BehaviorSubject<TransactionHistoryEntry[]> = new BehaviorSubject(new Array<TransactionHistoryEntry>());
  public utxos$: BehaviorSubject<UTxO[]> = new BehaviorSubject(new Array<UTxO>());
  public balance$: BehaviorSubject<bigint> = new BehaviorSubject(BigInt(0));
  public addresses$: BehaviorSubject<DerivedAddress[]> = new BehaviorSubject(new Array<DerivedAddress>());

  constructor(
    provider: BlockchainDataProvider,
    pollInterval: number = 30000,
    historyDepth: number = 20,
    info: BitcoinWalletInfo,
    network: Network = Network.Testnet
  ) {
    const bitcoinNetwork = network === Network.Mainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    this.network = network;
    this.pollInterval = pollInterval;
    this.historyDepth = historyDepth;
    this.provider = provider;
    this.info = info;

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
      .pipe(
        map((utxos) => utxos.reduce((total, utxo) => total + utxo.satoshis, BigInt(0)))
      )
      .subscribe((balance) => {
        console.error(`Balance ${balance}`);
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
    try {
      if (this.network === Network.Testnet) {
        return {
          fast: {
            feeRate: 0.00002500,
            targetConfirmationTime: 1
          },
          standard: {
            feeRate: 0.00001500,
            targetConfirmationTime: 3
          },
          slow: {
            feeRate: 0.00001000,
            targetConfirmationTime: 6
          }
        };
      }

      const fastEstimate = await this.provider.estimateFee(1, FeeEstimationMode.Conservative);
      const standardEstimate = await this.provider.estimateFee(3, FeeEstimationMode.Conservative);
      const slowEstimate = await this.provider.estimateFee(6, FeeEstimationMode.Conservative);

      return {
        fast: {
          feeRate: fastEstimate.feeRate,
          targetConfirmationTime: fastEstimate.blocks * 10 * 60
        },
        standard: {
          feeRate: standardEstimate.feeRate,
          targetConfirmationTime: standardEstimate.blocks * 10 * 60
        },
        slow: {
          feeRate: slowEstimate.feeRate,
          targetConfirmationTime: slowEstimate.blocks * 10 * 60
        }
      };
    } catch (error) {
      console.error('Failed to fetch fee market:', error);
      throw error;
    }
  }

  /**
   * Submits a raw transaction to the blockchain for inclusion in a block.
   *
   * @param rawTransaction - The raw transaction data to be broadcast to the network.
   */
  public async submitTransaction(rawTransaction: string): Promise<string> {
    try {
      return await this.provider.submitTransaction(rawTransaction);
    } catch (error) {
      console.error('Failed to submit transaction:', error);
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
    this.pollSubscription = interval(this.pollInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.provider.getLastKnownBlock()),
        catchError((error) => {
          console.error('Failed to fetch blockchain info during polling:', error);
          return of(null);
        })
      )
      .subscribe(async (latestBlockInfo: BlockInfo | null) => {
        if (!latestBlockInfo) return;

        await this.updateState(latestBlockInfo);

        if (!this.lastKnownBlock || this.lastKnownBlock.hash !== latestBlockInfo.hash) {
          await this.updateState(latestBlockInfo);
        } else {
          await this.updatePendingTransactions();
        }
      });
  }

  private async updateTransactions() {
    const newTxs = await this.provider.getTransactions(this.address.address, 0, this.historyDepth, 0);

    if (!isEqual(newTxs, this.transactionHistory)) {
      this.transactionHistory = newTxs;
      this.transactionHistory$.next(this.transactionHistory);
    }
  }

  private async updatePendingTransactions() {
    const pendingTxs = await this.provider.getTransactionsInMempool(this.address.address);

    const newPendingTxs = pendingTxs.filter((tx) => !this.transactionHistory.find((historyTx) => historyTx.transactionHash === tx.transactionHash));

    if (!isEqual(newPendingTxs, this.pendingTransactions$.value)) {
      this.pendingTransactions$.next(newPendingTxs);
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

    await this.updateTransactions();
    await this.updatePendingTransactions();
    await this.updateUtxos();

    this.lastKnownBlock = latestBlockInfo;
  }
}

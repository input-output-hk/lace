import { BlockchainDataProvider, BlockInfo, FeeEstimationMode, TransactionHistoryEntry, UTxO } from './../providers';
import { BehaviorSubject, interval, of, startWith } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  AddressType, BitcoinWalletInfo,
  deriveAddressByType,
  DerivedAddress,
  KeyPair, Network
} from '../common';
import * as bitcoin from 'bitcoinjs-lib';
import { Signer } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

bitcoin.initEccLib(ecc);

export class CustomSigner implements Signer {
  publicKey: Buffer;

  /**
   * Creates a new CustomSigner instance.
   * @param keyPair - The key pair to use for signing.
   */
  constructor(private keyPair: KeyPair) {
    if (!keyPair.privateKey) {
      throw new Error('Private key is required to sign transactions.');
    }
    this.publicKey = keyPair.publicKey;
  }

  /**
   * Signs a hash using tiny-secp256k1's sign function.
   * @param {Buffer} hash - The hash to sign (must be 32 bytes).
   * @param {boolean} _lowR - Optional flag for lowR signatures (ignored here).
   * @returns {Buffer} The signature as a buffer.
   */
  sign(hash: Buffer, _lowR: boolean = false): Buffer {
    if (hash.length !== 32) {
      throw new Error('Hash must be 32 bytes.');
    }

    const signature = ecc.sign(new Uint8Array(hash), new Uint8Array(this.keyPair.privateKey));
    return Buffer.from(signature);
  }

  /**
   * Returns the public key.
   * @returns {Buffer} The public key as a buffer.
   */
  getPublicKey(): Buffer {
    return this.publicKey;
  }

  /**
   * Clears the private key from memory.
   *
   * This is a security measure to prevent the private key from being exposed in memory.
   */
  clearSecrets() {
    this.keyPair.privateKey.fill(0);
  }
}

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
  private lastKnownBlock: BlockInfo | null = null;
  private transactionHistory: TransactionHistoryEntry[] = [];
  private readonly pollInterval: number;
  private readonly historyDepth: number;
  private provider: BlockchainDataProvider;

  public info: BitcoinWalletInfo;
  public network: Network;
  public transactionHistory$: BehaviorSubject<TransactionHistoryEntry[]> = new BehaviorSubject(new Array<TransactionHistoryEntry>());
  public address: DerivedAddress;
  public utxos$: BehaviorSubject<UTxO[]> = new BehaviorSubject(new Array<UTxO>());
  public balance$: BehaviorSubject<bigint> = new BehaviorSubject(BigInt(0));

  constructor(
    provider: BlockchainDataProvider,
    pollInterval: number = 300000,
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

    const pubKey = Buffer.from(info.publicKeyHex, 'hex');
    const address = deriveAddressByType(pubKey, AddressType.NativeSegWit, bitcoinNetwork);

    this.address =
      {
        address,
        addressType: AddressType.NativeSegWit,
        derivationPath: info.derivationPath
      };

    this.startPolling();

    this.utxos$
      .pipe(
        map((utxos) => utxos.reduce((total, utxo) => total + utxo.amount, BigInt(0)))
      )
      .subscribe((balance) => {
        this.balance$.next(balance);
      });
  }

  /**
   * Fetches the current fee market for estimating transaction fees.
   */
  public async getCurrentFeeMarket(): Promise<EstimatedFees> {
    try {
      const fastEstimate = await this.provider.estimateFee(1, FeeEstimationMode.Conservative);
      const standardEstimate = await this.provider.estimateFee(3, FeeEstimationMode.Conservative);
      const slowEstimate = await this.provider.estimateFee(6, FeeEstimationMode.Conservative);

      return {
        fast: {
          feeRate: fastEstimate.feeRate,
          targetConfirmationTime: fastEstimate.blocks * 10 * 60 * 60
        },
        standard: {
          feeRate: standardEstimate.feeRate,
          targetConfirmationTime: standardEstimate.blocks * 10 * 60 * 60
        },
        slow: {
          feeRate: slowEstimate.feeRate,
          targetConfirmationTime: slowEstimate.blocks * 10 * 60 * 60
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
   * Starts polling for new blocks and updating wallet state.
   */
  private startPolling() {
    interval(this.pollInterval)
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

        if (!this.lastKnownBlock || this.lastKnownBlock.hash !== latestBlockInfo.hash) {
          await this.updateState(latestBlockInfo);
        }
      });
  }

  /**
   * Updates the wallet state by fetching new transactions and UTxOs.
   */
  private async updateState(latestBlockInfo: BlockInfo): Promise<void> {
    this.lastKnownBlock = latestBlockInfo;

    this.transactionHistory = await this.provider.getTransactions(this.address.address, 0, this.historyDepth, 0);
    this.transactionHistory$.next(this.transactionHistory);

    const utxos = await this.provider.getUTxOs(this.address.address);
    this.utxos$.next(utxos);
    this.lastKnownBlock = latestBlockInfo;
  }
}

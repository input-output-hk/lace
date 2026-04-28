import type { BitcoinProviderContext } from './types';
import type { ProviderError } from '@cardano-sdk/core';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

/**
 * Represents basic information about a blockchain block.
 *
 * @property {number} height - The block's position in the blockchain.
 * @property {string} hash - The hash of the block.
 */
export type BitcoinBlockInfo = {
  readonly height: number;
  readonly hash: string;
};

/**
 * Enum representing the modes for estimating transaction fees.
 *
 * Fee estimation modes allow for flexibility in determining the trade-off
 * between transaction cost and confirmation time.
 */
export enum BitcoinFeeEstimationMode {
  /**
   * Conservative mode aims to prioritize transaction confirmation reliability.
   * Transactions estimated using this mode are less likely to be delayed,
   * but may incur higher fees.
   */
  Conservative = 'conservative',

  /**
   * Economical mode aims to minimize transaction fees, potentially
   * sacrificing faster confirmation times for lower costs.
   * Transactions estimated with this mode are better suited for non-urgent use cases.
   */
  Economical = 'economical',
}

/**
 * Represents the status of a Bitcoin transaction.
 */
export enum BitcoinTransactionStatus {
  /**
   * The transaction is in the mempool, waiting to be included in a block.
   */
  Pending = 'Pending',

  /**
   * The transaction is included in a block.
   */
  Confirmed = 'Confirmed',

  /**
   * The transaction is no longer in the mempool and is considered invalid or replaced.
   */
  Dropped = 'Dropped',
}

/**
 * Runes are a type of asset that can be held in Bitcoin transactions.
 * This type represents a holding of a specific rune
 * identified by its rune ID and the amount held.
 */
export type BitcoinRuneHolding = {
  runeId: string;
  // TODO: Find a better way to store this, is retrieved from Maestro as a decimal
  // string but is stored on chain as uint128_t, for now store it as a string
  amount: string;
};

/**
 * Represents a reference to an inscription in a Bitcoin transaction output.
 */
export type BitcoinInscriptionRef = {
  offset: number;
  inscriptionId: string;
};

/**
 * Represents an unspent transaction output (UTxO) in the Bitcoin blockchain.
 *
 * @property {string} txId - The unique identifier (transaction hash) of the transaction that created this output.
 * @property {number} index - The output index within the transaction.
 * @property {bigint} satoshis - The value of this output in satoshis.
 * @property {string} address - The common associated with this UTxO. This is the recipient of the funds in this output.
 */
export type BitcoinUTxO = {
  readonly txId: string;
  readonly index: number;
  readonly satoshis: number;
  readonly address: string;
  readonly script: string;
  readonly confirmations: number;
  readonly height: number;
  readonly runes: BitcoinRuneHolding[];
  readonly inscriptions: BitcoinInscriptionRef[];
};

/**
 * Represents a single input of a transaction.
 */
export type BitcoinInputEntry = {
  readonly txId: string;
  readonly index: number;
  readonly satoshis: number;
  readonly address: string;
  /** Whether the inputs are from a coinbase transaction */
  readonly isCoinbase: boolean;
  /** Raw coinbase script (hex) from the input of the coinbase tx */
  readonly coinbaseScript?: string;
};

/**
 * Represents a single output of a transaction.
 *
 * @property {string} address - The address involved in the transaction input or output.
 * @property {bigint} satoshis - The amount in satoshis for this input or output.
 * @property {string} opReturnData - The OP_RETURN data associated with this output, if any.
 */
export type BitcoinOutputEntry = {
  readonly address: string;
  readonly satoshis: number;
  readonly opReturnData?: string;
};

/**
 * Represents a single entry in the transaction history of an address.
 *
 * @property {BitcoinInputEntry[]} inputs - The inputs of the transaction, detailing the source of funds.
 * @property {BitcoinOutputEntry[]} outputs - The outputs of the transaction, detailing the destination of funds.
 * @property {string} transactionHash - The unique identifier (hash) of the transaction.
 * @property {number} confirmations - The number of confirmations for the transaction.
 *                                    More confirmations indicate higher confidence that the transaction is finalized.
 * @property {'Pending' | 'Confirmed'} status - The current status of the transaction.
 *                                              'Pending' indicates the transaction is not yet confirmed,
 *                                              while 'Confirmed' indicates it has been included in a block.
 * @property {number} blockHeight - The height of the block containing this transaction.
 * @property {number} timestamp - The timestamp of when the transaction was included in a block, represented as a Unix timestamp (milliseconds since epoch).
 */
export type BitcoinTransactionHistoryEntry = {
  inputs: BitcoinInputEntry[];
  outputs: BitcoinOutputEntry[];
  transactionHash: string;
  confirmations: number;
  status: BitcoinTransactionStatus;
  blockHeight: number;
  timestamp: number;
};

/**
 * Parameters for fetching items from the bitcoin provider.
 */
export type BitcoinQueryParams = {
  /**
   * Specifies to fetch items that occurred after this block height.
   */
  afterBlockHeight?: number;

  /**
   * The maximum number of items to return.
   */
  limit?: number;

  /**
   * Sort order for the items (from blockchain perspective).
   */
  order?: 'asc' | 'desc';

  /**
   * Pagination cursor to continue fetching items from where the last query ended.
   * If not provided, it will start from the beginning.
   */
  cursor?: string;
};

/**
 * Paginated response returned by Bitcoin data providers.
 *
 * @template T - Type of items in the current page.
 * @property {T[]} items - The list of results for this page.
 * @property {string} cursor - Opaque cursor to request the next page (empty when no more pages).
 */
export type BitcoinPaginatedResponse<T> = {
  items: T[];
  cursor: string;
};

/**
 * Represents the fee market for estimating transaction fees.
 */
export type BitcoinFeeMarket = {
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
export type BitcoinEstimatedFees = {
  /**
   * Fast tier: The fee and confirmation time for transactions requiring
   * high priority and the fastest possible confirmation.
   */
  fast: BitcoinFeeMarket;

  /**
   * Standard tier: The fee and confirmation time for transactions with
   * average priority, balancing cost and confirmation speed.
   */
  standard: BitcoinFeeMarket;

  /**
   * Slow tier: The fee and confirmation time for transactions with
   * low priority, suitable for non-urgent transfers.
   */
  slow: BitcoinFeeMarket;
};

/**
 * Interface for providing a fee estimation strategy.
 *
 * Implementations of this interface are responsible for retrieving
 * current fee market data from a source and returning a normalized fee structure.
 */
export interface BitcoinFeeMarketProvider {
  /**
   * Estimates the transaction fee in satoshis per byte based on three tiers of speed:
   * - Fast: For high-priority transactions requiring quick confirmation.
   * - Standard: For average-priority transactions with reasonable confirmation time.
   * - Slow: For low-priority transactions that can wait longer for confirmation.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @returns {Observable<Result<{ feeRate: number; blocks: number }, ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  getFeeMarket: (
    context: BitcoinProviderContext,
  ) => Observable<Result<BitcoinEstimatedFees, ProviderError>>;
}

/**
 * Defines the interface for interacting with the Bitcoin blockchain to fetch data and perform transactions.
 */
export interface BitcoinProvider {
  /**
   * Returns a cold observable, every new subscriber triggers one backend request and receives a single
   * BitcoinBlockInfo containing the latest block height and hash.
   *
   * If the request fails, the stream instead emits a
   * {@link ProviderError}.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @returns {Observable<Result<BitcoinBlockInfo,ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  getLastKnownBlock: (
    context: BitcoinProviderContext,
  ) => Observable<Result<BitcoinBlockInfo, ProviderError>>;

  /**
   * Fetches full details of a transaction given its hash.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @param txHash 32‑byte transaction ID in hexadecimal form.
   * @returns {Observable<Result<BitcoinTransactionHistoryEntry, ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  getTransaction: (
    context: BitcoinProviderContext,
    txHash: string,
  ) => Observable<Result<BitcoinTransactionHistoryEntry, ProviderError>>;

  /**
   * Fetches the transactions the history of transactions associated with a given blockchain address.
   * It supports pagination and can limit the results to transactions occurring after a specified block height.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @params address The blockchain address or script pubkey to query for transactions.
   * @param params  Query options (limit, cursor, afterHeight, …).
   * @returns       {Observable<Result<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>, ProviderError>>}
   *                Cold observable that emits exactly one {@link Result} and then completes.
   */
  getTransactions: (
    context: BitcoinProviderContext,
    address: string,
    params: BitcoinQueryParams,
  ) => Observable<
    Result<
      BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>,
      ProviderError
    >
  >;

  /**
   * Retrieves unconfirmed transactions (as transaction history entries) from the mempool for a given Bitcoin address.
   *
   * This function queries pending transactions associated with the specified Bitcoin address.
   * It returns an array of transaction history entries representing UTXOs that are currently unconfirmed.
   * Optionally, you can filter transactions to only include those observed after a specified block height.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @param {string} address The Bitcoin address or script pubkey to query for pending transactions.
   * @param params Query options (limit, cursor, afterHeight, …).
   * @returns {Observable<Result<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>, ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  getTransactionsInMempool: (
    context: BitcoinProviderContext,
    address: string,
    params: BitcoinQueryParams,
  ) => Observable<
    Result<
      BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>,
      ProviderError
    >
  >;

  /**
   * Fetches the unspent transaction outputs (UTxOs) associated with a specified common.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @param {string} address The blockchain common whose UTxOs are to be retrieved.
   * @param params Query options (limit, cursor, afterHeight, …).
   * @returns {Observable<Result<BitcoinPaginatedResponse<BitcoinUTxO>, ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  getUTxOs: (
    context: BitcoinProviderContext,
    address: string,
    params: BitcoinQueryParams,
  ) => Observable<Result<BitcoinPaginatedResponse<BitcoinUTxO>, ProviderError>>;

  /**
   * Submits a raw transaction to the blockchain for inclusion in a block.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @param {string} rawTransaction - The raw transaction data to be broadcast to the network in hex.
   * @returns {Observable<Result<string, ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  submitTransaction: (
    context: BitcoinProviderContext,
    rawTransaction: string,
  ) => Observable<Result<string, ProviderError>>;

  /**
   * Fetches the status of a specified transaction by its hash.
   *
   * This function checks the current status of a transaction in the blockchain or mempool.
   * The status can indicate if the transaction is pending, confirmed, or dropped.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @param {string} txHash - The hash of the transaction to query.
   * @returns {Observable<Result<BitcoinTransactionStatus, ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  getTransactionStatus: (
    context: BitcoinProviderContext,
    txHash: string,
  ) => Observable<Result<BitcoinTransactionStatus, ProviderError>>;

  /**
   * Estimates the transaction fee in satoshis per byte based on the desired confirmation time and fee estimation mode.
   *
   * This method queries a blockchain fee estimation service to determine the appropriate fee
   * rate required for a transaction to be confirmed within the specified number of blocks.
   *
   * This method returns a cold observable, every new subscriber triggers one backend request;
   * the stream then emits once and completes.
   *
   * @param {BitcoinProviderContext} context The context containing the provider specific configuration
   * such as network identifier.
   * @param {number} blocks - The target number of blocks within which the transaction should be confirmed.
   *                          A smaller number indicates a higher priority and typically results in a higher fee.
   *                          For example, `blocks = 1` requests a fee estimation for the next block confirmation.
   * @param {BitcoinFeeEstimationMode} mode - The fee estimation mode, which determines the trade-off between
   *                                   reliability and cost:
   *                                   - `FeeEstimationMode.Conservative`: Prioritizes confirmation reliability.
   *                                   - `FeeEstimationMode.Economical`: Aims to minimize fees, with potentially slower confirmations.
   * @returns {Observable<Result<{ feeRate: number; blocks: number }, ProviderError>>}
   *          Cold observable that emits exactly one {@link Result} and then completes.
   */
  estimateFee: (
    context: BitcoinProviderContext,
    blocks: number,
    mode: BitcoinFeeEstimationMode,
  ) => Observable<Result<BitcoinFeeMarket, ProviderError>>;
}

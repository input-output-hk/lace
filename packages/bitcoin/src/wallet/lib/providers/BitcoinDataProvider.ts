/**
 * Represents basic information about a blockchain block.
 *
 * @property {number} height - The block's position in the blockchain.
 * @property {string} hash - The hash of the block.
 */
export type BlockInfo = {
  readonly height: number;
  readonly hash: string;
};

/**
 * Enum representing the modes for estimating transaction fees.
 *
 * Fee estimation modes allow for flexibility in determining the trade-off
 * between transaction cost and confirmation time.
 */
export enum FeeEstimationMode {
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
export enum TransactionStatus {
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
 * Represents a single entry in the transaction history of an address.
 *
 * @property {InputOutputEntry[]} inputs - The inputs of the transaction, detailing the source of funds.
 * @property {InputOutputEntry[]} outputs - The outputs of the transaction, detailing the destination of funds.
 * @property {string} transactionHash - The unique identifier (hash) of the transaction.
 * @property {number} confirmations - The number of confirmations for the transaction.
 *                                    More confirmations indicate higher confidence that the transaction is finalized.
 * @property {'Pending' | 'Confirmed'} status - The current status of the transaction.
 *                                              'Pending' indicates the transaction is not yet confirmed,
 *                                              while 'Confirmed' indicates it has been included in a block.
 * @property {number} blockHeight - The height of the block containing this transaction.
 */
export type TransactionHistoryEntry = {
  readonly inputs: InputOutputEntry[];
  readonly outputs: InputOutputEntry[];
  readonly transactionHash: string;
  readonly confirmations: number;
  readonly status: TransactionStatus;
  readonly blockHeight: number;
  readonly timestamp: number;
};

/**
 * Represents a single input or output of a transaction.
 *
 * @property {string} address - The address involved in the transaction input or output.
 * @property {bigint} satoshis - The amount in satoshis for this input or output.
 */
export type InputOutputEntry = {
  readonly address: string;
  readonly satoshis: bigint;
};

/**
 * Represents an unspent transaction output (UTxO) in the Bitcoin blockchain.
 *
 * @property {string} txId - The unique identifier (transaction hash) of the transaction that created this output.
 * @property {number} index - The output index within the transaction.
 * @property {bigint} amount - The value of this output in satoshis.
 * @property {string} address - The common associated with this UTxO. This is the recipient of the funds in this output.
 */
export type UTxO = {
  readonly txId: string;
  readonly index: number;
  readonly amount: bigint;
  readonly address: string;
};

/**
 * Defines the interface for interacting with the Bitcoin blockchain to fetch data and perform transactions.
 */
export interface BlockchainDataProvider {
  /**
   * Fetches basic information about the last known block height and hash.
   *
   * @returns {Promise<BlockInfo>} An observable that emits the current blockchain information.
   */
  getLastKnownBlock(): Promise<BlockInfo>;

  /**
   * Fetches the transactions of a specified common.
   *
   * @param {string} address - The blockchain common whose transactions are to be retrieved.
   * @param {number} [afterBlockHeight] - Fetch transactions that occurred after this block height (optional).
   * @param {number} [limit=50] - The maximum number of transactions to fetch (optional, default is 50).
   * @param {number} [offset=0] - The starting index for transactions (optional, default is 0).
   * @returns {Promise<TransactionHistoryEntry[]>} An observable that emits a list of transactions
   *                                                  associated with the common.
   */
  getTransactions(
    address: string,
    afterBlockHeight?: number,
    limit?: number,
    offset?: number
  ): Promise<TransactionHistoryEntry[]>;

  /**
   * Fetches the unspent transaction outputs (UTxOs) associated with a specified common.
   *
   * @param {string} address - The blockchain common whose UTxOs are to be retrieved.
   * @returns {Promise<UTxO[]>} An observable that emits a list of UTxOs for the common.
   */
  getUTxOs(address: string): Promise<UTxO[]>;

  /**
   * Submits a raw transaction to the blockchain for inclusion in a block.
   *
   * @param {string} rawTransaction - The raw transaction data to be broadcast to the network.
   * @returns {Promise<string>} An observable that emits the transaction ID (hash) of the submitted transaction.
   */
  submitTransaction(rawTransaction: string): Promise<string>;

  /**
   * Fetches the status of a specified transaction by its hash.
   *
   * This function checks the current status of a transaction in the blockchain or mempool.
   * The status can indicate if the transaction is pending, confirmed, or dropped.
   *
   * @param {string} txHash - The hash of the transaction to query.
   * @returns {Promise<TransactionStatus>} An observable that emits the current status of the transaction.
   */
  getTransactionStatus(txHash: string): Promise<TransactionStatus>;

  /**
   * Estimates the transaction fee in satoshis per byte based on the desired confirmation time and fee estimation mode.
   *
   * This method queries a blockchain fee estimation service to determine the appropriate fee
   * rate required for a transaction to be confirmed within the specified number of blocks.
   *
   * @param {number} blocks - The target number of blocks within which the transaction should be confirmed.
   *                          A smaller number indicates a higher priority and typically results in a higher fee.
   *                          For example, `blocks = 1` requests a fee estimation for the next block confirmation.
   * @param {FeeEstimationMode} mode - The fee estimation mode, which determines the trade-off between
   *                                   reliability and cost:
   *                                   - `FeeEstimationMode.Conservative`: Prioritizes confirmation reliability.
   *                                   - `FeeEstimationMode.Economical`: Aims to minimize fees, with potentially slower confirmations.
   * @returns {Promise<number>} A promise that resolves to the estimated fee in satoshis per byte.
   *                            This value can be used to calculate the total transaction fee
   *                            based on the size of the transaction in bytes.
   *
   * @throws {Error} If the fee estimation service is unavailable or returns an invalid response.
   */
  estimateFee(blocks: number, mode: FeeEstimationMode): Promise<{ feeRate: number, blocks: number }>;
}

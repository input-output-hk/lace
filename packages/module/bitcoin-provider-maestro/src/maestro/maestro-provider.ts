import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { contextLogger } from '@cardano-sdk/util';
import { BitcoinTransactionStatus } from '@lace-contract/bitcoin-context';
import { isNotFoundError, toProviderError } from '@lace-lib/util-provider';

import { btcStringToSatoshis, getOpReturnData } from './util';

import type {
  MaestroAddressMempoolUtxoResponse,
  MaestroAddressTransactionsResponse,
  MaestroAddressUtxosResponse,
  MaestroFeeEstimateResponse,
  MaestroGetMempoolTransactionsQueryParams,
  MaestroGetTransactionsQueryParams,
  MaestroGetUTxOsQueryParams,
  MaestroInfoResponse,
  MaestroTransactionResponse,
  MaestroVin,
  MaestroVout,
} from './maestro-api-schema';
import type {
  BitcoinBlockInfo,
  BitcoinFeeEstimationMode,
  BitcoinPaginatedResponse,
  BitcoinTransactionHistoryEntry,
  BitcoinUTxO,
  BitcoinFeeMarket,
} from '@lace-contract/bitcoin-context';
import type {
  HttpClient,
  HttpRequestOptions,
  HttpRequestResponse,
} from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

/**
 * High‑level REST wrapper around Maestro’s Bitcoin API.
 */
export class MaestroBitcoinProvider {
  protected logger: Logger;
  readonly #client: HttpClient;
  readonly #txCache = new Map<string, BitcoinTransactionHistoryEntry>();

  /**
   * Creates a new instance of the Maestro Bitcoin provider.
   *
   * @param client  Pre‑configured HTTP client.
   * @param logger  Any ts‑log compatible logger implementation.
   */
  public constructor(client: HttpClient, logger: Logger) {
    this.#client = client;
    this.logger = contextLogger(logger, this.constructor.name);
  }

  /**
   * Fetches the current block height and hash.
   *
   * @returns {Promise<BitcoinBlockInfo>} A promise that resolves with the current blockchain information.
   */
  public async getLastKnownBlock(): Promise<BitcoinBlockInfo> {
    const {
      data: {
        last_updated: { block_height, block_hash },
      },
    } = await this.request<MaestroInfoResponse>('/rpc/general/info');

    return {
      height: Number(block_height),
      hash: block_hash,
    };
  }

  /**
   * Retrieves detailed information about a specific blockchain transaction by its hash.
   *
   * @param {string} txHash - The hash of the transaction to retrieve. This is typically a unique identifier
   * in hexadecimal format.
   * @returns {Promise<BitcoinTransactionHistoryEntry>} A promise that resolves to a `TransactionHistoryEntry`.
   *
   * @throws {Error} Throws an error if the transaction cannot be retrieved, which might occur due to network issues,
   * incorrect transaction hash, or the transaction not existing in the blockchain.
   */
  public async getTransaction(
    txHash: string,
  ): Promise<BitcoinTransactionHistoryEntry> {
    if (this.#txCache.has(txHash)) {
      return this.#txCache.get(txHash)!;
    }

    const {
      data: { data },
    } = await this.request<MaestroTransactionResponse>(
      `/rpc/transaction/${txHash}`,
      { params: { verbose: true } },
    );

    const entry = this.mapTxEntry(txHash, data);

    if (entry.confirmations > 0) this.#txCache.set(txHash, entry);

    return entry;
  }

  /**
   * Retrieve a **paginated**, (reverse‑chronological by default) history of transactions
   * that involve a given address.
   *
   * @param {string} address - The Bitcoin address or script pubkey to query for transactions.
   * @param parameters - Optional parameters to filter and paginate the transaction history.
   *
   * @returns `BitcoinPaginatedResponse` –
   *          `{ items: TransactionHistoryEntry[]; cursor: string }`.
   */
  public async getTransactions(
    address: string,
    parameters?: MaestroGetTransactionsQueryParams,
  ): Promise<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>> {
    try {
      const {
        data: { data: edges = [], next_cursor },
      } = await this.request<MaestroAddressTransactionsResponse>(
        `/addresses/${address}/txs`,
        { params: { order: 'desc', count: 50, ...parameters } },
      );

      const transactions: BitcoinTransactionHistoryEntry[] = [];
      for (const { tx_hash } of edges) {
        transactions.push(await this.getTransaction(tx_hash));
      }

      return { items: transactions, cursor: next_cursor ?? '' };
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return { items: [], cursor: '' };
      }
      throw error;
    }
  }

  /**
   * Retrieves unconfirmed transactions (as transaction history entries) from the mempool for a given Bitcoin address.
   *
   * This function queries pending transactions associated with the specified Bitcoin address.
   * It returns an array of transaction history entries representing UTXOs that are currently unconfirmed.
   * Optionally, you can filter transactions to only include those observed after a specified block height.
   *
   * @param {string} address - The Bitcoin address or script pubkey to query for pending transactions.
   * @param parameters - Optional parameters to filter and paginate the transaction history.
   * @returns `BitcoinPaginatedResponse` –
   *          `{ items: TransactionHistoryEntry[]; cursor: string }`.
   */
  public async getTransactionsInMempool(
    address: string,
    parameters?: MaestroGetMempoolTransactionsQueryParams,
  ): Promise<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>> {
    try {
      const {
        data: { data: utxos = [], next_cursor },
      } = await this.request<MaestroAddressMempoolUtxoResponse>(
        `/mempool/addresses/${address}/utxos`,
        { params: { order: 'desc', ...parameters } },
      );

      if (utxos.length === 0) return { items: [], cursor: '' };

      const seen = new Set<string>();
      const pendingPromises: Promise<BitcoinTransactionHistoryEntry>[] = [];

      for (const { txid, mempool: isInMempool } of utxos) {
        if (seen.has(txid) || !isInMempool) continue;
        seen.add(txid);
        pendingPromises.push(this.mapTxToPendingEntry(txid));
      }

      return {
        items: await Promise.all(pendingPromises),
        cursor: next_cursor ?? '',
      };
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return { items: [], cursor: '' };
      }
      throw error;
    }
  }

  /**
   * Fetches the unspent transaction outputs (UTxOs) associated with a specified address.
   *
   * @returns {Promise<BitcoinUTxO[]>} A promise that resolves with a list of UTxOs for the address.
   */
  public async getUTxOs(
    address: string,
    parameters?: MaestroGetUTxOsQueryParams,
  ): Promise<BitcoinPaginatedResponse<BitcoinUTxO>> {
    try {
      const {
        data: { data: utxos = [], next_cursor },
      } = await this.request<MaestroAddressUtxosResponse>(
        `/addresses/${address}/utxos`,
        { params: { ...parameters } },
      );
      return {
        items: utxos.map(out => ({
          txId: out.txid,
          index: out.vout,
          satoshis: Number.parseInt(out.satoshis, 10),
          address: out.address,
          script: out.script_pubkey,
          height: out.height,
          confirmations: out.confirmations,
          inscriptions: out.inscriptions.map(inscription => ({
            offset: inscription.offset,
            inscriptionId: inscription.inscription_id,
          })),
          runes: out.runes.map(rune => ({
            runeId: rune.rune_id,
            amount: rune.amount,
          })),
        })),
        cursor: next_cursor ?? '',
      };
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return { items: [], cursor: '' };
      }
      throw error;
    }
  }

  /**
   * Submits a raw transaction to the blockchain for inclusion in a block.
   *
   * @returns {Promise<string>} A promise that resolves with the transaction hash of the submitted transaction.
   */
  public async submitTransaction(rawTransaction: string): Promise<string> {
    const { data, status } = await this.request<string>(
      '/rpc/transaction/submit',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawTransaction),
      },
    );

    if (status !== 201) {
      throw new ProviderError(
        ProviderFailure.InvalidResponse,
        `Unexpected response status: ${status} - ${JSON.stringify(data)}`,
      );
    }

    return data;
  }

  /**
   * Fetches the status of a specified transaction by its hash.
   *
   * @returns {Promise<BitcoinTransactionStatus>} A promise that resolves with the current status of the transaction.
   */
  public async getTransactionStatus(
    txHash: string,
  ): Promise<BitcoinTransactionStatus> {
    try {
      const { status } = await this.getTransaction(txHash);
      return status;
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return BitcoinTransactionStatus.Dropped;
      }
      throw error;
    }
  }

  /**
   * Estimates the transaction fee in BTC per kilobyte based on the desired confirmation time and fee estimation mode.
   *
   * This method queries a blockchain fee estimation service to determine the appropriate fee
   * rate required for a transaction to be confirmed within the specified number of blocks.
   *
   * @param {number} blocks - The target number of blocks within which the transaction should be confirmed.
   *                          A smaller number indicates a higher priority and typically results in a higher fee.
   *                          For example, `blocks = 1` requests a fee estimation for the next block confirmation.
   * @param {BitcoinFeeEstimationMode} mode - The fee estimation mode, which determines the trade-off between
   *                                   reliability and cost:
   *                                 - `FeeEstimationMode.Conservative`: Prioritizes confirmation reliability.
   *                                 - `FeeEstimationMode.Economical`: Aims to minimize fees, with potentially slower confirmations.
   * @returns {Promise<number>} A promise that resolves to the estimated fee in satoshis per byte.
   *                            This value can be used to calculate the total transaction fee
   *                            based on the size of the transaction in bytes.
   */
  public async estimateFee(
    blocks: number,
    mode: BitcoinFeeEstimationMode,
  ): Promise<BitcoinFeeMarket> {
    const {
      data: { data },
      status,
    } = await this.request<MaestroFeeEstimateResponse>(
      `/rpc/transaction/estimatefee/${blocks}`,
      {
        params: { mode },
      },
    );

    if (status !== 200) {
      throw new ProviderError(
        ProviderFailure.InvalidResponse,
        'Invalid response from fee estimation API.',
      );
    }

    return {
      feeRate: data.feerate,
      targetConfirmationTime: data.blocks,
    };
  }

  /**
   * Transform a Maestro transaction record into the wallet’s
   * `TransactionHistoryEntry` format.
   *
   * @param txHash     The transaction hash.
   * @param data       The data payload returned by `/rpc/transaction/{hash}`.
   * @param overrides  Partial entry whose properties overwrite the derived base
   *                   values (e.g. `{ status: Pending, confirmations: -1 }`).
   *
   * @returns A fully populated `TransactionHistoryEntry`.
   * @private
   */
  private mapTxEntry(
    txHash: string,
    data: MaestroTransactionResponse['data'],
    overrides: Partial<BitcoinTransactionHistoryEntry> = {},
  ): BitcoinTransactionHistoryEntry {
    const base: BitcoinTransactionHistoryEntry = {
      inputs: data.vin.map((vin: MaestroVin) => ({
        txId: vin.txid ?? '',
        index: vin.vout ?? 0,
        address: vin.address ?? '',
        satoshis: btcStringToSatoshis(vin.value!.toString()),
        isCoinbase: !!vin.coinbase,
        coinbaseScript: vin.coinbase ?? '',
      })),
      outputs: data.vout.map((vout: MaestroVout) => ({
        address: vout.address,
        satoshis: btcStringToSatoshis(vout.value.toString()),
        opReturnData: getOpReturnData(vout),
      })),
      transactionHash: txHash,
      confirmations: data.confirmations,
      status:
        data.confirmations > 0
          ? BitcoinTransactionStatus.Confirmed
          : BitcoinTransactionStatus.Pending,
      blockHeight: data.blockheight,
      timestamp: data.blocktime,
    };

    return { ...base, ...overrides };
  }

  /**
   * Maps a transaction hash to a pending transaction entry.
   *
   * @param txHash The transaction hash to map.
   * @private
   */
  private async mapTxToPendingEntry(
    txHash: string,
  ): Promise<BitcoinTransactionHistoryEntry> {
    const { data } = await this.request<MaestroTransactionResponse>(
      `/rpc/transaction/${txHash}`,
      { params: { verbose: true } },
    );

    return this.mapTxEntry(txHash, data.data, {
      confirmations: -1,
      status: BitcoinTransactionStatus.Pending,
      blockHeight: 0,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  /**
   * Performs a generic HTTP request to the Maestro API.
   * @private
   */
  private async request<T>(
    endpoint: string,
    options?: HttpRequestOptions,
  ): Promise<HttpRequestResponse<T>> {
    try {
      this.logger.debug('request', endpoint);
      const response = await this.#client.request<T>(endpoint, options);
      this.logger.debug('response', JSON.stringify(response));
      return response;
    } catch (error) {
      this.logger.debug('error', error);
      throw toProviderError(error);
    }
  }
}

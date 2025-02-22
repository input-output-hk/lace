import axios, { AxiosInstance } from 'axios';
import {
  BlockchainDataProvider,
  BlockInfo,
  FeeEstimationMode,
  TransactionHistoryEntry,
  TransactionStatus,
  UTxO
} from './BitcoinDataProvider';
import { Network } from '../common';

export class MaestroBitcoinDataProvider implements BlockchainDataProvider {
  private api: AxiosInstance;

  constructor(token: string, network: Network = Network.Mainnet) {
    this.api = axios.create({
      baseURL: `https://xbt-${network}.gomaestro-api.org/v0`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': token
      }
    });
  }

  /**
   * Fetches basic information about the blockchain, including the current block height and hash.
   *
   * @returns {Promise<BlockInfo>} A promise that resolves with the current blockchain information.
   */
  async getLastKnownBlock(): Promise<BlockInfo> {
    const response = await this.api.get('/rpc/general/info');
    const blockHeight = response.data?.last_updated?.block_height || 0;
    const blockHash = response.data?.last_updated?.block_hash || '';
    return { height: blockHeight, hash: blockHash };
  }

  /**
   * Fetches the transaction history for an address.
   */
  async getTransactions(
    address: string,
    afterBlockHeight?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionHistoryEntry[]> {
    const params: Record<string, any> = { limit, offset, order: 'desc' };

    if (afterBlockHeight !== undefined) {
      params.from = afterBlockHeight;
    }

    try {
      const response = await this.api.get(`/addresses/${address}/txs`, { params });
      const transactions = response.data.data || [];
      return await Promise.all(
        transactions.map(async (tx: any) => {
          const details = await this.getTransactionDetails(tx.tx_hash);
          return {
            inputs: details.inputs.map((input: any) => ({
              address: input.address,
              satoshis: BigInt(input.satoshis)
            })),
            outputs: details.outputs.map((output: any) => ({
              address: output.address,
              satoshis: BigInt(output.satoshis)
            })),
            transactionHash: tx.tx_hash,
            confirmations: details.confirmations,
            status:
              details.confirmations > 0
                ? TransactionStatus.Confirmed
                : TransactionStatus.Pending,
            blockHeight: details.height,
            timestamp: details.unix_timestamp
          };
        })
      );
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetches the unspent transaction outputs (UTxOs) associated with a specified address.
   *
   * @returns {Promise<UTxO[]>} A promise that resolves with a list of UTxOs for the address.
   */
  async getUTxOs(address: string): Promise<UTxO[]> {
    try {
      const response = await this.api.get(`/addresses/${address}/utxos`);
      const utxos = response.data.data || [];
      return utxos.map((utxo: any) => ({
        txId: utxo.txid,
        index: parseInt(utxo.vout, 10),
        amount: BigInt(utxo.satoshis),
        address: utxo.address
      }));
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Submits a raw transaction to the blockchain for inclusion in a block.
   *
   * @returns {Promise<string>} A promise that resolves with the transaction hash of the submitted transaction.
   */
  async submitTransaction(rawTransaction: string): Promise<string> {
    const endpoint = '/rpc/transaction/submit';

    try {
      const response = await this.api.post(endpoint, JSON.stringify(rawTransaction));

      if (response.status === 201 && response.data) {
        return response.data;
      } else {
        throw new Error(
          `Unexpected response status: ${response.status} - ${JSON.stringify(response.data)}`
        );
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Transaction submission failed: ${error.response.data?.error || 'Unknown error'}`
        );
      } else {
        throw new Error('Transaction submission failed due to an unknown error.');
      }
    }
  }

  /**
   * Fetches the status of a specified transaction by its hash.
   *
   * @returns {Promise<TransactionStatus>} A promise that resolves with the current status of the transaction.
   */
  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      const response = await this.api.get(`/rpc/transaction/${txHash}`);
      const data = response.data;

      if (data.confirmations > 0) {
        return TransactionStatus.Confirmed;
      } else {
        return TransactionStatus.Pending;
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return TransactionStatus.Dropped;
      }
      throw new Error(`Failed to fetch transaction status: ${error.message}`);
    }
  }

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
   */
  async estimateFee(blocks: number, mode: FeeEstimationMode): Promise<{ feeRate: number, blocks: number }> {
    try {
      const response = await this.api.get(`/rpc/transaction/estimatefee/${blocks}?mode=${mode}`);

      if (response.status !== 200) {
        throw new Error('Invalid response from fee estimation API.');
      }
      return { feeRate: response.data.data.feerate, blocks: response.data.data.blocks };
    } catch (error: any) {
      console.error('Error estimating fee:', error.message || error);
      throw new Error('Failed to estimate fee. Please try again later.');
    }
  }

  /**
   * Fetches details of a specific transaction by its hash.
   */
  private async getTransactionDetails(txHash: string): Promise<any> {
    const response = await this.api.get(`/transactions/${txHash}`);
    return response.data.data;
  }
}

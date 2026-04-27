import { contextLogger } from '@cardano-sdk/util';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { toProviderError } from '@lace-lib/util-provider';

import type { MempoolSpaceFeeEstimateResponse } from './mempool-api-schema';
import type { BitcoinEstimatedFees } from '@lace-contract/bitcoin-context';
import type { HttpClient, HttpRequestOptions } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

export const MIN_FEE_RATE = 0.000_011;

export const DEFAULT_MARKETS = {
  fast: {
    feeRate: 0.000_025,
    targetConfirmationTime: 1,
  },
  standard: {
    feeRate: 0.000_015,
    targetConfirmationTime: 3,
  },
  slow: {
    feeRate: 0.000_011,
    targetConfirmationTime: 6,
  },
};

/**
 * Converts a fee rate in satoshis per vbyte to BTC per kilobyte.
 * @param satsPerVByte The fee rate in satoshis per vbyte.
 */
const satsPerVByteToBtcPerKB = (satsPerVByte: number): number =>
  (satsPerVByte * 1000) / 100_000_000;

/**
 * High‑level REST wrapper around Mempool.space’s Bitcoin feemarket API API.
 */
export class MempoolFeeMarketProvider {
  protected logger: Logger;
  readonly #client: HttpClient;

  /**
   * Creates a new instance of the Mempool FeeMarket provider.
   *
   * @param client  Pre‑configured HTTP client.
   * @param logger  Any ts‑log compatible logger implementation.
   */
  public constructor(client: HttpClient, logger: Logger) {
    this.#client = client;
    this.logger = contextLogger(logger, this.constructor.name);
  }

  /**
   * Estimates the transaction fee in BTC per kilobyte based on the desired confirmation time and fee estimation mode.
   *
   * This method queries a blockchain fee estimation service to determine the appropriate fee
   * rate required for a transaction to be confirmed within the specified number of blocks.
   *
   * @returns {Promise<number>} A promise that resolves to the estimated fee in satoshis per byte.
   *                            This value can be used to calculate the total transaction fee
   *                            based on the size of the transaction in bytes.
   */
  public async getFeeMarket(
    network: BitcoinNetwork,
  ): Promise<BitcoinEstimatedFees> {
    try {
      if (network === BitcoinNetwork.Testnet) {
        return DEFAULT_MARKETS;
      }

      const feeData = await this.request<MempoolSpaceFeeEstimateResponse>(
        '/api/v1/fees/recommended',
      );

      const fastEstimate = feeData.fastestFee;
      const standardEstimate = feeData.halfHourFee;
      const slowEstimate = feeData.hourFee;

      return {
        fast: {
          feeRate: Math.max(satsPerVByteToBtcPerKB(fastEstimate), MIN_FEE_RATE),
          targetConfirmationTime: 600,
        },
        standard: {
          feeRate: Math.max(
            satsPerVByteToBtcPerKB(standardEstimate),
            MIN_FEE_RATE,
          ),
          targetConfirmationTime: 1800,
        },
        slow: {
          feeRate: Math.max(satsPerVByteToBtcPerKB(slowEstimate), MIN_FEE_RATE),
          targetConfirmationTime: 3600,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch fee market:', error);
    }

    return DEFAULT_MARKETS;
  }

  /**
   * Performs a generic HTTP request to the Mempool.space API.
   * @private
   */
  private async request<T>(
    endpoint: string,
    options?: HttpRequestOptions,
  ): Promise<T> {
    try {
      this.logger.debug('request', endpoint);
      const response = await this.#client.request<T>(endpoint, options);
      this.logger.debug('response', JSON.stringify(response));
      return response.data;
    } catch (error) {
      this.logger.debug('error', error);
      throw toProviderError(error);
    }
  }
}

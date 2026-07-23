// copied from Lace v1
// https://github.com/input-output-hk/lace/blob/27873f3b5dd8ec0e6926a5dd1653986a97ac81e8/packages/cardano/src/wallet/lib/blockfrost-input-resolver.ts#L27

import { isNotFoundError } from '@lace-lib/util-provider';

import { BlockfrostProvider } from '../blockfrost-provider';
import { BlockfrostToCardanoSDK } from '../blockfrost-to-cardano-sdk';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { Cardano } from '@cardano-sdk/core';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

/**
 * A resolver class to fetch and resolve transaction inputs using Blockfrost API.
 */
export class BlockfrostInputResolverProvider
  extends BlockfrostProvider
  implements Cardano.InputResolver
{
  /**
   * Constructs a new BlockfrostInputResolverProvider.
   *
   * @param client - The Blockfrost client instance to interact with the Blockfrost API.
   * @param logger - The logger instance to log messages to.
   */
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Resolves a transaction input (`Cardano.TxIn`) to its corresponding output (`Cardano.TxOut`).
   *
   * @param input - The transaction input to resolve, including its transaction ID and index.
   * @returns A promise that resolves to the corresponding `Cardano.TxOut` if found, or `null` if not.
   */
  public async resolveInput(
    input: Cardano.TxIn,
  ): Promise<Cardano.TxOut | null> {
    this.logger.debug(`Resolving input ${input.txId}#${input.index}`);

    const out = await this.fetchTxOut(input);
    if (!out) return null;

    return out;
  }

  /**
   * Fetches and caches the transaction output (`Cardano.TxOut`) for a given transaction input (`Cardano.TxIn`).
   *
   * @private
   * @param txIn - The transaction input to fetch and cache the output for.
   * @returns A promise that resolves to the corresponding `Cardano.TxOut` if found, or `null` if not.
   */
  private async fetchTxOut(txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> {
    let response;

    try {
      response = await this.request<Responses['tx_content_utxo']>(
        `txs/${txIn.txId}/utxos`,
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch transaction ${txIn.txId}`, error);

      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }

    for (const blockfrostUTxO of response.outputs) {
      if (blockfrostUTxO.output_index !== txIn.index) {
        continue;
      }

      const coreTxOut = BlockfrostToCardanoSDK.txOut(blockfrostUTxO);

      this.logger.debug(
        `Resolved input ${txIn.txId}#${txIn.index} from Blockfrost`,
      );
      return coreTxOut;
    }

    this.logger.error(`Failed to resolve input ${txIn.txId}#${txIn.index}`);
    return null;
  }
}

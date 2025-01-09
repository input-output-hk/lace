/* eslint-disable unicorn/no-null, @typescript-eslint/no-non-null-assertion */
import { Cardano } from '@cardano-sdk/core';
import { BlockfrostClient, BlockfrostError, BlockfrostToCore } from '@cardano-sdk/cardano-services-client';
import { Logger } from 'ts-log';
import { Responses } from '@blockfrost/blockfrost-js';

const NOT_FOUND_STATUS = 404;

/**
 * Converts a Cardano.TxIn object to a unique UTXO ID.
 *
 * @param txIn - The transaction input containing a transaction ID and index.
 * @returns A string representing the unique UTXO ID in the format `txId#index`.
 */
const txInToId = (txIn: Cardano.TxIn): string => `${txIn.txId}#${txIn.index}`;

/**
 * A resolver class to fetch and resolve transaction inputs using Blockfrost API.
 */
export class BlockfrostInputResolver implements Cardano.InputResolver {
  readonly #logger: Logger;
  readonly #client: BlockfrostClient;
  readonly #txCache = new Map<string, Cardano.TxOut>();

  /**
   * Constructs a new BlockfrostInputResolver.
   *
   * @param client - The Blockfrost client instance to interact with the Blockfrost API.
   * @param logger - The logger instance to log messages to.
   */
  constructor(client: BlockfrostClient, logger: Logger) {
    this.#client = client;
    this.#logger = logger;
  }

  /**
   * Resolves a transaction input (`Cardano.TxIn`) to its corresponding output (`Cardano.TxOut`).
   *
   * @param txIn - The transaction input to resolve, including its transaction ID and index.
   * @param options - Optional resolution options (I.E hints for faster lookup).
   * @returns A promise that resolves to the corresponding `Cardano.TxOut` if found, or `null` if not.
   */
  public async resolveInput(txIn: Cardano.TxIn, options?: Cardano.ResolveOptions): Promise<Cardano.TxOut | null> {
    this.#logger.debug(`Resolving input ${txIn.txId}#${txIn.index}`);

    if (options?.hints) {
      for (const hint of options.hints) {
        if (txIn.txId === hint.id && hint.body.outputs.length > txIn.index) {
          this.#logger.debug(`Resolved input ${txIn.txId}#${txIn.index} from hint`);
          return hint.body.outputs[txIn.index];
        }
      }
    }

    const out = await this.fetchAndCacheTxOut(txIn);
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
  private async fetchAndCacheTxOut(txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> {
    const id = txInToId(txIn);

    if (this.#txCache.has(id)) {
      this.#logger.debug(`Resolved input ${txIn.txId}#${txIn.index} from cache`);
      return this.#txCache.get(id)!;
    }

    let response;

    try {
      response = await this.#client.request<Responses['tx_content_utxo']>(`txs/${txIn.txId}/utxos`);
    } catch (error: unknown) {
      this.#logger.error(`Failed to fetch transaction ${txIn.txId}`, error);

      if (error instanceof BlockfrostError && error?.status === NOT_FOUND_STATUS) {
        return null;
      }

      throw error;
    }

    for (const blockfrostUTxO of response.outputs) {
      if (blockfrostUTxO.output_index !== txIn.index) {
        continue;
      }

      const coreTxOut = BlockfrostToCore.txOut(blockfrostUTxO);

      this.#txCache.set(id, coreTxOut);

      this.#logger.debug(`Resolved input ${txIn.txId}#${txIn.index} from Blockfrost`);
      return coreTxOut;
    }

    this.#logger.error(`Failed to resolve input ${txIn.txId}#${txIn.index}`);
    return null;
  }
}

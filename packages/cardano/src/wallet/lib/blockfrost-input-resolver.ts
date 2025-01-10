/* eslint-disable unicorn/no-null, @typescript-eslint/no-non-null-assertion */
import { Cardano } from '@cardano-sdk/core';
import { BlockfrostClient, BlockfrostError, BlockfrostToCore } from '@cardano-sdk/cardano-services-client';
import { Logger } from 'ts-log';
import { Responses } from '@blockfrost/blockfrost-js';
import { InputResolverContext, txInEquals } from '@cardano-sdk/wallet';
import { firstValueFrom } from 'rxjs';
import { WitnessedTx } from '@cardano-sdk/key-management';

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
  #context: InputResolverContext | undefined;

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
   * @param input - The transaction input to resolve, including its transaction ID and index.
   * @param options - Optional resolution options (I.E hints for faster lookup).
   * @returns A promise that resolves to the corresponding `Cardano.TxOut` if found, or `null` if not.
   */
  /* eslint-disable sonarjs/cognitive-complexity */
  public async resolveInput(input: Cardano.TxIn, options?: Cardano.ResolveOptions): Promise<Cardano.TxOut | null> {
    this.#logger.debug(`Resolving input ${input.txId}#${input.index}`);

    if (this.#txCache.has(txInToId(input))) {
      this.#logger.debug(`Resolved input ${input.txId}#${input.index} from cache`);
      return this.#txCache.get(txInToId(input))!;
    }

    let resolved = await this.resolveFromContext(input);
    if (resolved) return resolved;

    resolved = this.resolveFromHints(input, options);
    if (resolved) return resolved;

    const out = await this.fetchAndCacheTxOut(input);
    if (!out) return null;

    return out;
  }

  /**
   * Sets the input resolution context (e.g., references to transaction history, available UTXOs, outgoing signed TXs).
   *
   * @param context - An instance of `InputResolverContext` providing data for resolution.
   */
  public setContext(context: InputResolverContext): void {
    this.#context = context;
  }

  /**
   * Retrieves the current input resolution context, if any.
   *
   * @returns The `InputResolverContext` instance, or `undefined` if not set.
   */
  public getContext(): InputResolverContext | undefined {
    return this.#context;
  }

  /**
   * Attempts to resolve the provided input from the hints provided in the resolution options.
   * @param input - The transaction input to resolve.
   * @param options - The resolution options containing hints.
   * @private
   */
  private resolveFromHints(input: Cardano.TxIn, options?: Cardano.ResolveOptions): Cardano.TxOut | null {
    if (options?.hints.transactions) {
      for (const hint of options.hints.transactions) {
        if (input.txId === hint.id && hint.body.outputs.length > input.index) {
          this.#logger.debug(`Resolved input ${input.txId}#${input.index} from hint`);
          this.#txCache.set(txInToId(input), hint.body.outputs[input.index]);

          return hint.body.outputs[input.index];
        }
      }
    }

    if (options?.hints.utxos) {
      for (const utxo of options.hints.utxos) {
        if (input.txId === utxo[0].txId && input.index === utxo[0].index) {
          this.#logger.debug(`Resolved input ${input.txId}#${input.index} from hint`);
          this.#txCache.set(txInToId(input), utxo[1]);

          return utxo[1];
        }
      }
    }

    return null;
  }

  /**
   * Fetches and caches the transaction output (`Cardano.TxOut`) for a given transaction input (`Cardano.TxIn`).
   *
   * @private
   * @param txIn - The transaction input to fetch and cache the output for.
   * @returns A promise that resolves to the corresponding `Cardano.TxOut` if found, or `null` if not.
   */
  private async fetchAndCacheTxOut(txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> {
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

      this.#txCache.set(txInToId(txIn), coreTxOut);

      this.#logger.debug(`Resolved input ${txIn.txId}#${txIn.index} from Blockfrost`);
      return coreTxOut;
    }

    this.#logger.error(`Failed to resolve input ${txIn.txId}#${txIn.index}`);
    return null;
  }

  /**
   * Attempts to resolve the provided input from the in-memory context (if available).
   *
   * The context includes:
   *   - Transaction history
   *   - Currently available UTXOs
   *   - Outgoing signed transactions that are not yet broadcast but may contain UTXOs
   *
   * @private
   * @param input - The transaction input to resolve.
   * @returns A promise that resolves to the corresponding `Cardano.TxOut` if found in context, or `null` otherwise.
   */
  private async resolveFromContext(input: Cardano.TxIn): Promise<Cardano.TxOut | null> {
    if (!this.#context) return null;

    const txHistory = await firstValueFrom(this.#context.transactions.history$);
    const utxoAvailable = await firstValueFrom(this.#context.utxo.available$, { defaultValue: [] });
    const signedTransactions = await firstValueFrom(this.#context.transactions.outgoing.signed$, {
      defaultValue: new Array<WitnessedTx>()
    });
    const utxoFromSigned = signedTransactions.flatMap(({ tx: signedTx }, signedTxIndex) =>
      signedTx.body.outputs
        .filter((_, outputIndex) => {
          const alreadyConsumed = signedTransactions.some(
            ({ tx: { body } }, i) =>
              signedTxIndex !== i &&
              body.inputs.some((consumedInput) => txInEquals(consumedInput, { index: outputIndex, txId: signedTx.id }))
          );

          return !alreadyConsumed;
        })
        .map((txOut): Cardano.Utxo => {
          const txIn: Cardano.HydratedTxIn = {
            address: txOut.address,
            index: signedTx.body.outputs.indexOf(txOut),
            txId: signedTx.id
          };
          return [txIn, txOut];
        })
    );
    const availableUtxo = [...utxoAvailable, ...utxoFromSigned].find(([txIn]) => txInEquals(txIn, input));

    if (availableUtxo) return availableUtxo[1];

    const historyTx = txHistory.findLast((entry) => entry.id === input.txId);

    if (historyTx && historyTx.body.outputs.length > input.index) {
      return historyTx.body.outputs[input.index];
    }

    return null;
  }
}

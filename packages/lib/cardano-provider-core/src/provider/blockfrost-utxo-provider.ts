import {
  ProviderError,
  ProviderFailure,
  Serialization,
  type Cardano,
} from '@cardano-sdk/core';
import { Err, Ok } from '@lace-lib/util';
import { isNotFoundError } from '@lace-lib/util-provider';
import {
  catchError,
  defer,
  from,
  map,
  mergeMap,
  of,
  toArray,
  type Observable,
} from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';
import { BlockfrostToCardanoSDK } from '../blockfrost-to-cardano-sdk';

import type { BlockfrostUtxo } from '../blockfrost-to-cardano-sdk';
import type { Responses } from '@blockfrost/blockfrost-js';
import type {
  CardanoPaymentAddress,
  CardanoRewardAccount,
  GetUtxosAtAddressProps,
} from '@lace-contract/cardano-context';
import type { Result } from '@lace-lib/util';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

/**
 * Producing-transaction reads in flight at once for one listing. Anyone can
 * pay to a listed address, so the number of producing transactions is not
 * ours to cap; a small bound overlaps round trips yet leaves Blockfrost
 * connections and rate-limit budget for the sync round's other reads.
 */
const MAX_CONCURRENT_TRANSACTION_READS = 4;

/**
 * The listed output as its producing transaction states it, script included.
 *
 * @throws the read's error, or a `ProviderError` when the output carries no
 * script with the listed hash
 */
const outputWithReferenceScript = (
  utxo: BlockfrostUtxo,
  transaction: Result<Serialization.Transaction, unknown>,
): Cardano.TxOut => {
  if (transaction.isErr()) throw transaction.error;
  const output = transaction.value.body().outputs().at(utxo.output_index);
  if (!output || output.scriptRef()?.hash() !== utxo.reference_script_hash) {
    throw new ProviderError(
      ProviderFailure.InvalidResponse,
      undefined,
      `Output ${utxo.tx_hash}#${utxo.output_index} carries no reference script with hash ${utxo.reference_script_hash}`,
    );
  }
  return output.toCore();
};

/**
 * Provider responsible for fetching UTxOs by reward account (stake address)
 * or by payment address.
 *
 * Each read starts on subscription, not on call, so a caller's retry
 * re-subscribes and re-requests. `from` over a started promise would replay
 * its settled result instead.
 */
export class BlockfrostUtxoProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Fetch UTxOs controlled by a reward account.
   *
   * Blockfrost returns 404 for a stake key that has never appeared on-chain,
   * that is a valid empty result here, not an error.
   */
  public getAccountUtxos({
    rewardAccount,
    pageSize = 100,
  }: {
    /** Stake address (e.g. `stake1...`). */
    rewardAccount: CardanoRewardAccount;
    /** UTxOs per Blockfrost page (default 100). */
    pageSize?: number;
  }): Observable<Result<Cardano.Utxo[], ProviderError>> {
    return defer(async () =>
      this.paginatedRequests<Responses['account_utxo_content']>({
        endpoint: `accounts/${rewardAccount}/utxos?order=desc`,
        pageSize,
      }),
    ).pipe(
      map(items => Ok(BlockfrostToCardanoSDK.accountUtxos(items))),
      catchError(error =>
        // Blockfrost responds 404 for a stake address with no UTxO history, a
        // valid empty result, not an error.
        isNotFoundError(error)
          ? of(Ok<Cardano.Utxo[]>([]))
          : of(Err(error as ProviderError)),
      ),
    );
  }

  /**
   * Fetch the UTxOs sitting at a single payment address, with inline datums
   * populated, and reference scripts too when `withReferenceScripts` is set.
   * Used to discover script-address UTxOs.
   *
   * Blockfrost returns 404 for an address that has never held funds; that is
   * a valid empty result here, not an error.
   *
   * `address` is a payment address (e.g. `addr1...` / a script `addr1w...`).
   * `pageSize` is the number of UTxOs per Blockfrost page (default 100), and
   * `withReferenceScripts` defaults to false.
   */
  public getUtxosAtAddress({
    address,
    pageSize = 100,
    withReferenceScripts = false,
  }: GetUtxosAtAddressProps): Observable<
    Result<Cardano.Utxo[], ProviderError>
  > {
    return defer(async () =>
      this.paginatedRequests<Responses['address_utxo_content']>({
        endpoint: `addresses/${address}/utxos?order=desc`,
        pageSize,
      }).catch((error: unknown) => {
        // Blockfrost responds 404 for an address with no UTxO history — a
        // valid empty result, not an error. This applies to the listing
        // only: an unreadable reference script excludes its UTxO below.
        if (isNotFoundError(error)) return [];
        throw error;
      }),
    ).pipe(
      mergeMap(items =>
        withReferenceScripts
          ? this.#withReferenceScripts(address, items)
          : of(
              items.map(utxo =>
                BlockfrostToCardanoSDK.addressUtxoContent(address, utxo),
              ),
            ),
      ),
      map(utxos => Ok(utxos)),
      catchError(error => of(Err(error as ProviderError))),
    );
  }

  /**
   * Converts listed UTxOs, each with its reference script. The listing names
   * only the script's hash, while the Conway fee (`minFee`) prices the
   * script's size: a spend of an output read without its script underpays,
   * and the node refuses the transaction. The script comes from the producing
   * transaction's CBOR, read once per transaction, and must hash to the
   * listed hash.
   *
   * An unreadable script excludes its UTxO, not the whole listing. Returning
   * that UTxO without its script would let a caller that classifies outputs
   * by their reference scripts select an unsafe fund or misclassify a foreign
   * reserve as its own.
   */
  #withReferenceScripts(
    address: CardanoPaymentAddress,
    items: Responses['address_utxo_content'],
  ): Observable<Cardano.Utxo[]> {
    const hashes = new Set(
      items.flatMap(utxo => (utxo.reference_script_hash ? [utxo.tx_hash] : [])),
    );
    // The reads stay in the subscription, not behind a promise, so
    // unsubscribing starts no queued read.
    return from(hashes).pipe(
      mergeMap(async hash => {
        const read = await this.#readTransaction(hash);
        return [hash, read] as const;
      }, MAX_CONCURRENT_TRANSACTION_READS),
      toArray(),
      map(reads => {
        const transactions = new Map(reads);
        return items.flatMap(utxo => {
          if (!utxo.reference_script_hash)
            return [BlockfrostToCardanoSDK.addressUtxoContent(address, utxo)];
          let output: Cardano.TxOut;
          try {
            output = outputWithReferenceScript(
              utxo,
              transactions.get(utxo.tx_hash)!,
            );
          } catch (error) {
            this.logger.warn(
              `Excluding UTxO ${utxo.tx_hash}#${utxo.output_index}: reference script unavailable`,
              error,
            );
            return [];
          }
          return [
            BlockfrostToCardanoSDK.addressUtxoContent(address, utxo, output),
          ];
        });
      }),
    );
  }

  async #readTransaction(
    hash: string,
  ): Promise<Result<Serialization.Transaction, unknown>> {
    try {
      const { cbor } = await this.request<Responses['tx_content_cbor']>(
        `txs/${hash}/cbor`,
      );
      return Ok(Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)));
    } catch (error) {
      return Err(error);
    }
  }
}

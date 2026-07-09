import { Cardano, Serialization } from '@cardano-sdk/core';
import { isNotFoundError } from '@lace-lib/util-provider';
import { Err, Ok, Timestamp } from '@lace-sdk/util';
import { catchError, forkJoin, from, map, type Observable, of } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';
import { BlockfrostToCardanoSDK } from '../blockfrost-to-cardano-sdk';

import { BlockfrostTxProvider } from './blockfrost-tx-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  CardanoTransactionHistoryItem,
  ExtendedTxDetails,
} from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Result } from '@lace-sdk/util';
import type { Logger } from 'ts-log';

type BlockfrostAddressTxList = Responses['address_transactions_content'];

/**
 * Provider responsible for fetching transaction history and details.
 */
export class BlockfrostActivityProvider extends BlockfrostProvider {
  readonly #txProvider: BlockfrostTxProvider;

  public constructor(
    client: HttpClient,
    logger: Logger,
    txProvider: BlockfrostTxProvider = new BlockfrostTxProvider(client, logger),
  ) {
    super(client, logger);
    this.#txProvider = txProvider;
  }

  /**
   * Fetches the transaction history for a Cardano address.
   *
   * @param address Cardano payment address to fetch transaction history for
   * @param numberOfItems How many history items should be fetched (order: newer -> older)
   * @param startAtBlock At which block (inclusive) should it start
   * @param startAtIndex At which index (inclusive) should it start
   * @returns Observable with Result containing the history items or an error
   */
  public getAddressTransactionHistory({
    address,
    numberOfItems,
    startAtBlock,
    startAtIndex,
    endAtBlock,
    endAtIndex,
    order = 'desc',
  }: {
    address: CardanoPaymentAddress;
    numberOfItems: number;
    startAtBlock?: Cardano.BlockNo;
    startAtIndex?: Cardano.TxIndex;
    endAtBlock?: Cardano.BlockNo;
    endAtIndex?: Cardano.TxIndex;
    order?: 'asc' | 'desc';
  }): Observable<Result<CardanoTransactionHistoryItem[], ProviderError>> {
    const fromIndexParameter =
      startAtIndex !== undefined ? `:${startAtIndex}` : '';
    const toIndexParameter = endAtIndex !== undefined ? `:${endAtIndex}` : '';
    const optionalFromParameter =
      startAtBlock !== undefined
        ? `&to=${startAtBlock}${fromIndexParameter}`
        : '';
    const optionalToParameter =
      endAtBlock !== undefined ? `&from=${endAtBlock}${toIndexParameter}` : '';
    return from(
      this.request<BlockfrostAddressTxList>(
        `addresses/${address}/transactions?count=${numberOfItems}&order=${order}${optionalFromParameter}${optionalToParameter}`,
      ),
    ).pipe(
      map(addressTxHistory =>
        Ok(
          addressTxHistory.map(item => ({
            txId: Cardano.TransactionId(item.tx_hash),
            txIndex: Cardano.TxIndex(item.tx_index),
            blockNumber: Cardano.BlockNo(item.block_height),
            blockTime: Timestamp(item.block_time * 1000), // BF returns it in seconds, we want milliseconds
          })),
        ),
      ),
      catchError(error => {
        // Blockfrost returns 404 for any address that has not yet had any
        // on-chain activity. This is not a fetch failure — it simply means
        // there are no transactions for this address yet. Treating it as an
        // error would fail the per-account transaction-polling sync round,
        // and the next tip change would re-enqueue the same failing op,
        // creating an infinite failure loop for fresh / unused addresses.
        if (isNotFoundError(error)) {
          return of(Ok<CardanoTransactionHistoryItem[]>([]));
        }
        return of(Err(error as ProviderError));
      }),
    );
  }

  /**
   * Fetches transaction details, cbor and utxos to build a Cardano.HydratedTx
   * which is returned inside a tuple together with the tx details which holds
   * additional info not stored in the HydratedTx.
   *
   * @param txId Cardano.TransactionId
   */
  public getTransactionDetails(
    txId: Cardano.TransactionId,
  ): Observable<Result<ExtendedTxDetails, ProviderError>> {
    // Fetch all tx details in parallel and fail if any request fails
    return forkJoin([
      from(this.#txProvider.getTransaction(txId)),
      this.#fetchTxFromCbor(txId),
      this.#fetchUtxos(txId),
    ]).pipe(
      map(([txDetails, blockfrostTxCBOR, blockFrostUtxos]) => {
        // We can't use txFromCBOR.body.inputs since it misses HydratedTxIn.address
        const { inputs, outputs, collaterals } =
          BlockfrostToCardanoSDK.transactionUtxos(
            blockFrostUtxos,
            blockfrostTxCBOR,
          );

        const inputSource: Cardano.InputSource = txDetails.valid_contract
          ? Cardano.InputSource.inputs
          : Cardano.InputSource.collaterals;

        const body: Cardano.HydratedTxBody = {
          ...(inputSource === Cardano.InputSource.collaterals
            ? {
                collateralReturn: outputs.length > 0 ? outputs[0] : undefined,
                collaterals: inputs,
                fee: BigInt(0),
                inputs: [],
                outputs: [],
                totalCollateral: blockfrostTxCBOR.body.fee,
              }
            : {
                collateralReturn:
                  blockfrostTxCBOR.body.collateralReturn ?? undefined,
                collaterals,
                fee: blockfrostTxCBOR.body.fee,
                inputs,
                outputs,
              }),
          certificates: blockfrostTxCBOR.body.certificates ?? [],
          mint: blockfrostTxCBOR.body.mint
            ? new Map([...blockfrostTxCBOR.body.mint].sort())
            : undefined,
          proposalProcedures: blockfrostTxCBOR.body.proposalProcedures,
          validityInterval: blockfrostTxCBOR.body.validityInterval
            ? blockfrostTxCBOR.body.validityInterval
            : { invalidBefore: undefined, invalidHereafter: undefined },
          votingProcedures: blockfrostTxCBOR.body.votingProcedures,
          withdrawals: blockfrostTxCBOR.body.withdrawals,
        };
        const hydratedTx: Cardano.HydratedTx = {
          auxiliaryData: blockfrostTxCBOR.auxiliaryData,
          blockHeader: {
            blockNo: Cardano.BlockNo(txDetails.block_height),
            hash: Cardano.BlockId(txDetails.block),
            slot: Cardano.Slot(txDetails.slot),
          },
          body,
          id: txId,
          index: txDetails.index,
          inputSource,
          txSize: 0,
          witness: blockfrostTxCBOR.witness,
        };
        return Ok({
          ...hydratedTx,
          blockTime: txDetails.block_time,
        } satisfies ExtendedTxDetails);
      }),
      catchError(error => of(Err(error))),
    );
  }

  #fetchTxFromCbor(txId: Cardano.TransactionId): Observable<Cardano.Tx> {
    return from(
      this.request<Responses['tx_content_cbor']>(`txs/${txId}/cbor`),
    ).pipe(
      map(({ cbor }) =>
        Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)).toCore(),
      ),
    );
  }

  #fetchUtxos(
    txId: Cardano.TransactionId,
  ): Observable<Responses['tx_content_utxo']> {
    return from(
      this.request<Responses['tx_content_utxo']>(`txs/${txId}/utxos`),
    );
  }
}

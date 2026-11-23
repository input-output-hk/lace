import { TransactionHistoryDetail } from '@midnightntwrk/wallet-sdk-indexer-client';
import { HttpQueryClient } from '@midnightntwrk/wallet-sdk-indexer-client/effect';
import { Effect } from 'effect';
import { Observable } from 'rxjs';

/** Only an explicit fee-recovery request may call this exact-hash query. */
export const fetchTransactionFee = (
  indexerAddress: string,
  hash: string,
): Observable<string | undefined> =>
  new Observable(subscriber => {
    const controller = new AbortController();
    const query = Effect.gen(function* () {
      const request = yield* TransactionHistoryDetail;
      const result = yield* request({ transactionHash: hash });
      const transaction = result.transactions.find(
        tx => tx.hash.toLowerCase() === hash,
      );
      const fee =
        transaction?.__typename === 'RegularTransaction'
          ? transaction.fees?.paidFees
          : undefined;
      // Missing metadata is not a zero fee. Match the hash because an offset
      // query must not accidentally supply another transaction's fee.
      return typeof fee === 'string' && /^\d+$/.test(fee) ? fee : undefined;
    }).pipe(
      Effect.provide(HttpQueryClient.layer({ url: indexerAddress })),
      Effect.scoped,
      Effect.timeout('15 seconds'),
    );
    void Effect.runPromise(query, { signal: controller.signal }).then(
      fee => {
        subscriber.next(fee);
        subscriber.complete();
      },
      () => {
        subscriber.error(new Error('Transaction fee lookup failed'));
      },
    );
    return () => {
      controller.abort();
    };
  });

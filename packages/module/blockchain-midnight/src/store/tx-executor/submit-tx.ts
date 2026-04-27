import { midnightWallets$ } from '@lace-contract/midnight-context';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import curry from 'lodash/fp/curry';
import { catchError, map, of, switchMap, take, throwError } from 'rxjs';

import { mapMidnightSubmitError } from './error-mapping';

import type {
  MidnightWalletsByAccountId,
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata,
} from '@lace-contract/midnight-context';
import type {
  TxExecutorImplementation,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { FinalizedTransaction } from '@midnight-ntwrk/ledger-v8';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

// TODO: LW-13722 Remove once the problem with the `bytes()` method support on chrome is resolved
Blob.prototype.bytes =
  Blob.prototype.bytes ||
  async function bytes() {
    // @ts-expect-error TS2683
    return new Uint8Array(await (this as Blob).arrayBuffer());
  };

export const makeSubmitTx =
  (
    wallets$: Observable<MidnightWalletsByAccountId>,
    { logger }: { logger: Logger },
  ): TxExecutorImplementation<
    MidnightSpecificSendFlowData,
    MidnightSpecificTokenMetadata
  >['submitTx'] =>
  ({ accountId, serializedTx }) => {
    return wallets$.pipe(
      take(1),
      map(wallets => wallets[accountId]),
      switchMap(midnightWallet =>
        midnightWallet
          ? of(midnightWallet)
          : throwError(
              () =>
                new Error(
                  `Could not load midnight wallet for account ${accountId}`,
                ),
            ),
      ),
      // IMPORTANT: wallet.submitTransaction() must be reached for the SDK's
      // built-in rollback to work. The SDK's WalletFacade.submitTransaction()
      // calls this.revert(tx) on failure, which clears pending coins.
      // If this pipeline throws before submitTransaction() (e.g. wallet lookup
      // fails), confirmTx's finalizeRecipe() will have already marked coins as
      // pending with no path to revert them.
      switchMap(midnightWallet => {
        const finalizedTx: FinalizedTransaction = Transaction.deserialize(
          'signature',
          'proof',
          'binding',
          ByteArray.fromHex(HexBytes(serializedTx)),
        );
        return midnightWallet.submitTransaction(finalizedTx);
      }),
      map(
        txId =>
          ({
            success: true,
            txId,
          } satisfies TxSubmissionResult),
      ),
      catchError((error: Error) => {
        logger.error(error);
        return of({
          success: false,
          ...mapMidnightSubmitError(error),
        } as TxSubmissionResult);
      }),
    );
  };

export const submitTx = curry(makeSubmitTx)(midnightWallets$);

import { ByteArray, HexBytes } from '@lace-lib/util';
import { observeSubmission } from '@lace-lib/vendor/midnight-submission-service';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import {
  catchError,
  defer,
  finalize,
  map,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';

import { takeSendSubmission } from '../send-proof-progress';

import { mapMidnightSubmitError } from './error-mapping';

import type {
  MidnightSideEffectsDependencies,
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
        const report = takeSendSubmission(
          accountId,
          finalizedTx.identifiers().at(-1) ?? '',
        );
        report?.({
          type: 'phase',
          phase: 'transaction-submitting',
          status: 'started',
        });
        const stopObserving = observeSubmission(finalizedTx, stage => {
          report?.({
            type: 'phase',
            phase:
              stage === 'Submitted'
                ? 'transaction-inclusion'
                : 'transaction-confirmation',
            status: stage === 'Finalized' ? 'completed' : 'started',
          });
        });
        return defer(() => midnightWallet.submitTransaction(finalizedTx)).pipe(
          tap({
            error: () =>
              report?.({
                type: 'phase',
                phase: 'transaction-failed',
                status: 'failed',
              }),
          }),
          finalize(stopObserving),
        );
      }),
      map(
        txId =>
          ({
            success: true,
            txId,
            // WalletFacade.submitTransaction waits for the 'Finalized' stage,
            // so resolving here means the tx is already on chain — and txId is
            // tx.identifiers().at(-1), not the hash the synced row is keyed by.
            awaitsFinalization: true,
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

/** Submits through the engine wallets of the app instance the dependencies belong to. */
export const submitTx = (
  dependencies: Pick<MidnightSideEffectsDependencies, 'midnightWallets$'> & {
    logger: Logger;
  },
) => makeSubmitTx(dependencies.midnightWallets$, dependencies);

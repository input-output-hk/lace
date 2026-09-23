import { Serialization } from '@cardano-sdk/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { CollateralOwnershipError } from './assert-collateral-ownership';
import {
  collateralRefusalCase,
  resolveCollateralOwnershipSets,
} from './collateral-ownership';

import type { CollateralOwnershipErrorCase } from './assert-collateral-ownership';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
} from './types';
import type { Observable } from 'rxjs';

const REFUSE_ON_FAILURE: CollateralOwnershipErrorCase =
  'foreign-collateral-return';

/**
 * Wraps a Cardano `TransactionSigner` so `sign()` runs the collateral-return
 * ownership rule against the request's own tx body before delegating -- the
 * authoritative, fail-closed net beneath the local-only pre-consent check,
 * run once per signer regardless of origin. Collateral inputs are classified
 * through the context's resolver ({@link resolveCollateralOwnershipSets}):
 * resolved to one of our payment keys is ours, anything else is not. The
 * wrapped signer never sees a refused transaction.
 *
 * Fails closed rather than delegating on anything the compiler cannot
 * guarantee at runtime: a `collateralInputResolver` or `knownAddresses`
 * missing behind an `as unknown as` cast, a tx whose CBOR does not decode, or
 * an unexpected throw anywhere in the evaluation.
 */
export const withCollateralOwnershipGuard = (
  signer: CardanoTransactionSigner,
  context: CardanoTransactionSignerContext,
): CardanoTransactionSigner => ({
  sign: (request: CardanoSignRequest): Observable<CardanoSignResult> => {
    if (!context.collateralInputResolver || !context.knownAddresses) {
      return throwError(() => new CollateralOwnershipError(REFUSE_ON_FAILURE));
    }

    const refusal$ = from(
      (async () => {
        const { body } = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(request.serializedTx),
        ).toCore();
        return collateralRefusalCase(
          body,
          await resolveCollateralOwnershipSets({
            body,
            resolveInput: async input =>
              context.collateralInputResolver.resolveInput(input),
            knownAddresses: context.knownAddresses,
          }),
        );
      })(),
    ).pipe(
      // Undecodable CBOR, or any other unexpected throw: refuse rather than
      // let a raw SDK error escape and never sign at all.
      catchError(() =>
        throwError(() => new CollateralOwnershipError(REFUSE_ON_FAILURE)),
      ),
    );

    return refusal$.pipe(
      switchMap(refusal =>
        refusal
          ? throwError(() => new CollateralOwnershipError(refusal))
          : signer.sign(request),
      ),
    );
  },
});

import { catchError, concat, ignoreElements, throwError } from 'rxjs';

import type { MidnightTxRecipe } from './build-midnight-transfer';
import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { Observable } from 'rxjs';

/** A recipe the engine built but has not balanced, signed or proved. */
type UnprovenRecipe = Extract<
  MidnightTxRecipe,
  { type: 'UNPROVEN_TRANSACTION' }
>;

export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Releases a recipe the engine built, then rethrows the error that made it
 * useless. The engine reserves a recipe's inputs when it builds it and the
 * caller never receives this recipe, so nothing else could release them. If
 * the release fails too, the error is an `AggregateError` of both failures and
 * the coins stay reserved until a sync reset.
 */
export const releaseThenThrow = (
  midnightWallet: Pick<MidnightWallet, 'revert'>,
  recipe: MidnightTxRecipe,
  error: unknown,
): Observable<never> =>
  concat(
    midnightWallet.revert(recipe).pipe(
      ignoreElements(),
      catchError((releaseError: unknown) =>
        throwError(
          () =>
            new AggregateError(
              [error, releaseError],
              `${messageOf(
                error,
              )}; the coins it reserved could not be released: ${messageOf(
                releaseError,
              )}`,
            ),
        ),
      ),
    ),
    throwError(() => error),
  );

/**
 * Pays a built recipe's fee with DUST. The engine books the recipe's inputs
 * when it builds it, so a failure here releases them before the error is
 * returned: the caller has no recipe to discard.
 */
export const balanceMidnightRecipe = (
  midnightWallet: Pick<MidnightWallet, 'balanceUnprovenTransaction' | 'revert'>,
  recipe: UnprovenRecipe,
  ttl: Date,
): Observable<MidnightTxRecipe> =>
  midnightWallet
    .balanceUnprovenTransaction(recipe.transaction, {
      ttl,
      tokenKindsToBalance: ['dust'],
    })
    .pipe(
      catchError((balancingError: unknown) =>
        releaseThenThrow(midnightWallet, recipe, balancingError),
      ),
    );

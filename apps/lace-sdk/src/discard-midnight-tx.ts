import { defer } from 'rxjs';

import { withMidnightWallet } from './midnight-wallet';

import type { MidnightTxRecipe } from './build-midnight-transfer';
import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { Result } from '@lace-lib/util';

/** The options of `discardMidnightTx`. */
export interface DiscardMidnightTxProps extends MidnightAccountProps {
  /** A recipe from a build or registration helper, signed or not. */
  recipe: MidnightTxRecipe;
}

/**
 * Releases the coins a built recipe holds, so they return to the account's
 * available balance and a later build can select them.
 *
 * Discard only a recipe that never reached proving: consent declined,
 * `signMidnightTx` failed, or `proveMidnightTx` returned
 * `MidnightAccountNotFoundError`, `MidnightWalletNotReadyError` or a
 * `RangeError` for its `proveTimeout`, which are raised before proving. Do
 * not discard after any other `proveMidnightTx`
 * error, including a timeout, nor after it returned a transaction: the engine
 * releases a recipe whose proving fails, and releases a proved transaction
 * that never reaches the chain once its validity window (`ttl`) has passed.
 * Pass the `accountId` the recipe was built with: under another account the
 * release finds no reserved coins and still reports `Ok`. The release works
 * per coin, not per transaction, so discarding a recipe the engine has
 * already released, or one built before a sync reset cleared its
 * reservation, can free coins that a later build reserved
 * for a transaction still in flight. For the same reason, never discard a
 * recipe whose transaction was passed to `submitMidnightTx`.
 */
export const discardMidnightTx = async (
  wallet: WalletWithMidnight,
  { recipe, ...account }: DiscardMidnightTxProps,
): Promise<Result<void, Error>> =>
  withMidnightWallet(wallet, account, midnightWallet =>
    defer(() => midnightWallet.revert(recipe)),
  );

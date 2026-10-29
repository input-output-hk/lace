import { defer } from 'rxjs';

import { withMidnightWallet } from './midnight-wallet';

import type { MidnightTxRecipe } from './build-midnight-transfer';
import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { Result } from '@lace-lib/util';

/** The options of `signMidnightTx`. */
export interface SignMidnightTxProps extends MidnightAccountProps {
  recipe: MidnightTxRecipe;
}

/**
 * Signs the recipe's unshielded inputs with the account's NIGHT key. The
 * module's password unlocks the key; no prompt is shown. Obtain consumer consent
 * for the exact transaction and account before invoking this helper.
 */
export const signMidnightTx = async (
  wallet: WalletWithMidnight,
  { recipe, ...account }: SignMidnightTxProps,
): Promise<Result<MidnightTxRecipe, Error>> =>
  withMidnightWallet(wallet, account, midnightWallet =>
    defer(() => midnightWallet.signRecipe(recipe)),
  );

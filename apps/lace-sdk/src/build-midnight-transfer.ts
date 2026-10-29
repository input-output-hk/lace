import {
  defaultTxTtlLength,
  toUnshieldedTokenType,
  NIGHT_TOKEN_ID,
} from '@lace-contract/midnight-context';
import { normalizeMidnightTransfers } from '@lace-module/midnight-sync/sdk';
import {
  MidnightBech32m,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import { defer, switchMap } from 'rxjs';

import { balanceMidnightRecipe } from './balance-midnight-recipe';
import { withMidnightWallet } from './midnight-wallet';

import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { Result } from '@lace-lib/util';
import type { BalancingRecipe } from '@midnightntwrk/wallet-sdk/facade';

/**
 * A built transaction and what balances it: signed by `signMidnightTx`, proved
 * by `proveMidnightTx`, or released by `discardMidnightTx`. The engine reserves
 * the coins a recipe spends when it is built: they leave the available balance
 * until the transaction is submitted or the recipe is discarded, and the
 * reservation is persisted, so an abandoned recipe keeps them out of later
 * builds until a sync reset.
 */
export type MidnightTxRecipe = BalancingRecipe;

/** The options of `buildMidnightTransfer`: the recipient and amount of NIGHT. */
export interface BuildMidnightTransferProps extends MidnightAccountProps {
  /** Bech32m unshielded address (`mn_addr_...`) of the active network. */
  to: string;
  /** NIGHT in its smallest unit. */
  amount: bigint;
  /** When the transaction stops being valid; one hour from now by default. */
  ttl?: Date;
}

/**
 * Builds an unshielded NIGHT transfer, selecting the inputs and the DUST
 * that pays its fee. The recipe is unsigned and unproven, and reserves its
 * inputs (see `MidnightTxRecipe`): obtain consent from `estimateMidnightFee`,
 * which reserves nothing, before building. When the fee cannot be paid, the
 * inputs the build reserved are released and the balancing error is returned;
 * if that release fails too, the error is an `AggregateError` of both failures
 * and the NIGHT stays reserved until a sync reset.
 */
export const buildMidnightTransfer = async (
  wallet: WalletWithMidnight,
  { to, amount, ttl, ...account }: BuildMidnightTransferProps,
): Promise<Result<MidnightTxRecipe, Error>> =>
  withMidnightWallet(wallet, account, midnightWallet =>
    defer(() => {
      normalizeMidnightTransfers(midnightWallet.networkId, 'unshielded', [
        {
          to,
          amount,
          tokenId: toUnshieldedTokenType(
            NIGHT_TOKEN_ID,
            midnightWallet.networkId,
          ),
        },
      ]);
      const resolvedTtl = ttl ?? new Date(Date.now() + defaultTxTtlLength);
      // Built without its fee, then balanced, so that a release that fails
      // beside a fee failure is reported (`AggregateError`), not dropped.
      return midnightWallet
        .transferTransaction(
          [
            {
              type: 'unshielded',
              outputs: [
                {
                  type: NIGHT_TOKEN_ID,
                  receiverAddress: UnshieldedAddress.codec.decode(
                    midnightWallet.networkId,
                    MidnightBech32m.parse(to),
                  ),
                  amount,
                },
              ],
            },
          ],
          { ttl: resolvedTtl, payFees: false },
        )
        .pipe(
          switchMap(recipe =>
            balanceMidnightRecipe(midnightWallet, recipe, resolvedTtl),
          ),
        );
    }),
  );

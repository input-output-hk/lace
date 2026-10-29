import { defaultTxTtlLength } from '@lace-contract/midnight-context';
import { normalizeMidnightTransfers } from '@lace-module/midnight-sync/sdk';
import {
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import { defer, switchMap } from 'rxjs';

import { balanceMidnightRecipe } from './balance-midnight-recipe';
import { withMidnightWallet } from './midnight-wallet';

import type { MidnightTxRecipe } from './build-midnight-transfer';
import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { Result } from '@lace-lib/util';

/** A homogeneous batch using token IDs from the account's token state. */
export type MidnightTransferBatch = MidnightAccountProps & {
  kind: 'shielded' | 'unshielded';
  outputs: readonly [
    { to: string; tokenId: string; amount: bigint },
    ...{ to: string; tokenId: string; amount: bigint }[],
  ];
  /** One hour from now by default. */
  ttl?: Date;
};

/**
 * Builds an unsigned, unproven batch. The engine selects tokens and fee DUST
 * and reserves them (see `MidnightTxRecipe`): obtain consent from
 * `estimateMidnightFee`, which reserves nothing, before building. When the
 * fee cannot be paid, the inputs the build reserved are released and the
 * balancing error is returned; if that release fails too, the error is an
 * `AggregateError` of both failures and the coins stay reserved until a sync
 * reset.
 */
export const buildMidnightTransfers = async (
  wallet: WalletWithMidnight,
  { kind, outputs, ttl, ...account }: MidnightTransferBatch,
): Promise<Result<MidnightTxRecipe, Error>> =>
  withMidnightWallet(wallet, account, engine =>
    defer(() => {
      const transfers = normalizeMidnightTransfers(
        engine.networkId,
        kind,
        outputs,
      );
      const desiredOutputs =
        kind === 'shielded'
          ? {
              type: 'shielded' as const,
              outputs: transfers.map(({ address, tokenId, amount }) => ({
                type: tokenId,
                amount,
                receiverAddress: ShieldedAddress.codec.decode(
                  engine.networkId,
                  MidnightBech32m.parse(address),
                ),
              })),
            }
          : {
              type: 'unshielded' as const,
              outputs: transfers.map(({ address, tokenId, amount }) => ({
                type: tokenId,
                amount,
                receiverAddress: UnshieldedAddress.codec.decode(
                  engine.networkId,
                  MidnightBech32m.parse(address),
                ),
              })),
            };
      const resolvedTtl = ttl ?? new Date(Date.now() + defaultTxTtlLength);
      // Built without its fee, then balanced, so that a release that fails
      // beside a fee failure is reported (`AggregateError`), not dropped.
      return engine
        .transferTransaction([desiredOutputs], {
          ttl: resolvedTtl,
          payFees: false,
        })
        .pipe(
          switchMap(recipe =>
            balanceMidnightRecipe(engine, recipe, resolvedTtl),
          ),
        );
    }),
  );

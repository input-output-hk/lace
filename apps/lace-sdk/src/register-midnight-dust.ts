import {
  defaultTxTtlLength,
  getDesignationTargetType,
  NIGHT_TOKEN_ID,
} from '@lace-contract/midnight-context';
import { BigNumber } from '@lace-lib/util';
import {
  DustAddress,
  MidnightBech32m,
} from '@midnightntwrk/wallet-sdk-address-format';
import { combineLatest, map, switchMap, take } from 'rxjs';

import { balanceMidnightRecipe } from './balance-midnight-recipe';
import { MidnightNothingToRegisterError } from './midnight-errors';
import { withMidnightWallet } from './midnight-wallet';

import type { MidnightTxRecipe } from './build-midnight-transfer';
import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { Result } from '@lace-lib/util';
import type {
  FacadeState,
  UtxoWithMeta,
} from '@midnightntwrk/wallet-sdk/facade';

/** The options of `registerMidnightDust`. */
export interface RegisterMidnightDustProps extends MidnightAccountProps {
  /**
   * Optional destination on the account's network. Refused while the account
   * is designated for DUST generation; omit it to register to the account's
   * own address.
   */
  dustAddress?: string;
  /**
   * Not accepted. The engine sets a registration's validity window (one hour
   * from building) and the fee estimate uses the same window, so a supplied
   * value is refused rather than ignored.
   */
  ttl?: never;
}

/**
 * Whether the account already takes part in DUST generation: registered
 * NIGHT, generated DUST, or generation capacity (the contract's
 * `getDesignationTargetType` plus capacity). The engine does not report where
 * registered NIGHT generates, so this covers a designation to the account's
 * own address and to an external one alike.
 */
const isDesignatedForDust = (
  state: FacadeState,
  nightCoins: readonly UtxoWithMeta[],
) =>
  getDesignationTargetType(
    nightCoins.map(({ utxo, meta }) => ({
      status: 'available' as const,
      value: BigNumber(utxo.value),
      registeredForDustGeneration: meta.registeredForDustGeneration,
    })),
    state.dust.totalCoins.reduce((sum, coin) => sum + coin.generatedNow, 0n),
  ) !== 'none' || state.dust.totalCoins.some(coin => coin.maxCap > 0n);

/** Internal unsigned selection shared with fee estimation. */
export const prepareMidnightDustRegistration = (
  midnightWallet: MidnightWallet,
  {
    dustAddress: destination,
    ttl,
  }: Pick<RegisterMidnightDustProps, 'dustAddress' | 'ttl'>,
) =>
  combineLatest([
    midnightWallet.state().pipe(take(1)),
    midnightWallet.address$.pipe(take(1)),
  ]).pipe(
    map(([state, address]) => {
      if (ttl !== undefined)
        throw new Error(
          'A DUST registration does not accept ttl: the engine sets its validity window',
        );
      const nightCoins = state.unshielded.availableCoins.filter(
        ({ utxo }) => utxo.type === NIGHT_TOKEN_ID,
      );
      if (
        nightCoins.length === 0 ||
        nightCoins.every(({ utxo }) => utxo.value <= 0n)
      )
        throw new MidnightNothingToRegisterError(midnightWallet.accountId);
      const dustAddress = DustAddress.codec.decode(
        midnightWallet.networkId,
        MidnightBech32m.parse(destination ?? address.dust),
      );
      if (destination !== undefined && isDesignatedForDust(state, nightCoins))
        throw new Error(
          'DUST destination cannot be changed while the account is designated for DUST generation',
        );
      return {
        state,
        nightCoins,
        dustAddress,
        destination: destination ?? address.dust,
        isRepeatRegistration: nightCoins.some(
          coin => coin.meta.registeredForDustGeneration,
        ),
      };
    }),
  );

/**
 * Registers every available NIGHT UTXO. Obtain consumer consent before
 * calling: registration signs internally.
 *
 * - An explicit `dustAddress` is refused while the account is designated for
 *   DUST generation (registered NIGHT, generated DUST or generation capacity),
 *   so it never redirects an existing designation.
 * - Without `dustAddress` the NIGHT is registered to the account's own DUST
 *   address, whatever it is registered to now. NIGHT registered to an external
 *   address is therefore re-registered to the account's own address. When some
 *   NIGHT is already registered, the registration is balanced with DUST.
 *
 * The returned recipe reserves the NIGHT it registers (see `MidnightTxRecipe`).
 * When the registration cannot be built, the NIGHT it reserved is released
 * and the build error is returned; if that release fails too, the error is an
 * `AggregateError` of both failures, and the NIGHT stays reserved until a
 * sync reset. The wallet library does not release it when the fee query of a
 * first registration fails; it then also stays reserved until a sync reset.
 */
export const registerMidnightDust = async (
  wallet: WalletWithMidnight,
  { ttl, dustAddress: destination, ...account }: RegisterMidnightDustProps = {},
): Promise<Result<MidnightTxRecipe, Error>> =>
  withMidnightWallet(wallet, account, midnightWallet =>
    prepareMidnightDustRegistration(midnightWallet, {
      dustAddress: destination,
      ttl,
    }).pipe(
      switchMap(({ nightCoins, dustAddress, isRepeatRegistration }) => {
        const registration$ =
          midnightWallet.registerNightUtxosForDustGeneration(
            nightCoins,
            dustAddress,
          );
        if (!isRepeatRegistration) return registration$;
        return registration$.pipe(
          switchMap(registration =>
            // The engine reserved the NIGHT when it built the registration;
            // the caller never receives that recipe, so release it on failure.
            balanceMidnightRecipe(
              midnightWallet,
              registration,
              new Date(Date.now() + defaultTxTtlLength),
            ),
          ),
        );
      }),
    ),
  );

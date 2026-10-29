import { feeRateFromSatsPerVByte } from '@lace-contract/bitcoin-context';
import { Err, Ok } from '@lace-lib/util';
import {
  bitcoinAccountWallets$,
  buildBitcoinPayment,
  DUST_THRESHOLD,
  SyncStatus,
} from '@lace-module/blockchain-bitcoin/sdk';
import {
  type Observable,
  combineLatest,
  filter,
  firstValueFrom,
  map,
  switchMap,
  take,
  timeout,
} from 'rxjs';

import {
  findBitcoinAccountWallet,
  resolveBitcoinAccount,
  resolveBitcoinAccountId,
} from './resolve-bitcoin-account';

import type { activitiesSelectors } from '@lace-contract/activities';
import type { StateObservables } from '@lace-contract/module';
import type { networkSelectors } from '@lace-contract/network';
import type { AccountId, walletsSelectors } from '@lace-contract/wallet-repo';
import type { HexBytes, Milliseconds, Result } from '@lace-lib/util';
import type {
  BitcoinWallet,
  BuildBitcoinPaymentParams,
} from '@lace-module/blockchain-bitcoin/sdk';

type RequiredObservables = StateObservables<
  typeof activitiesSelectors & typeof networkSelectors & typeof walletsSelectors
>;

/**
 * Structural requirement: the wallet must have been created with the Bitcoin
 * modules loaded (blockchainBitcoin, a Bitcoin provider and a fee market).
 */
export type WalletWithBitcoinTxBuilding = {
  stateObservables: Pick<
    RequiredObservables,
    'activities' | 'network' | 'wallets'
  >;
};

/**
 * The fee rate of a Bitcoin transaction: one of the fee market's tiers, read
 * from the wallet's fee market when the transaction is built, or a custom
 * rate in satoshis per virtual byte.
 */
export type BitcoinFeeRate =
  | {
      /**
       * The fee market tier: `Fast`, `Average` or `Low`, for a quicker or a
       * cheaper confirmation.
       */
      feeOption: 'Average' | 'Fast' | 'Low';
    }
  | {
      /** A rate chosen by the caller instead of a fee market tier. */
      feeOption: 'Custom';
      /**
       * The rate, in satoshis per virtual byte: a finite number above 0 and
       * at most 10,000.
       */
      satsPerVByte: number;
    };

/** A recipient of a Bitcoin payment. */
export type BitcoinRecipient = {
  /** The recipient's address. */
  address: string;
  /**
   * The amount sent to the recipient, in satoshis: a whole number of at least
   * 546, the dust limit below which nodes refuse to relay an output.
   */
  amount: number;
};

/** The options of `buildBitcoinTx`: the payment, and the account paying it. */
export interface BuildBitcoinTxProps {
  /**
   * Bitcoin account that pays. Required when more than one Bitcoin account is
   * present on the active network.
   */
  accountId?: AccountId;
  /** The recipients of the payment, one output each. */
  recipients: readonly BitcoinRecipient[];
  /** The fee rate the transaction pays. */
  feeRate: BitcoinFeeRate;
  /** An optional message, embedded in an OP_RETURN output. */
  memo?: string;
}

/** An unsigned Bitcoin transaction, ready for `signBitcoinTx`. */
export type UnsignedBitcoinTx = {
  /** The unsigned transaction, serialized for the signers. */
  serializedTx: HexBytes;
  /** The network fee the transaction pays, in satoshis. */
  fee: bigint;
};

const isPositiveSatoshiAmount = (amount: number) =>
  Number.isSafeInteger(amount) && amount > 0;

const validateRecipients = (
  recipients: readonly BitcoinRecipient[],
): Result<void, Error> => {
  if (recipients.length === 0) {
    return Err(new Error('At least one recipient is required'));
  }
  const invalid = recipients.find(
    ({ amount }) => !isPositiveSatoshiAmount(amount),
  );
  if (invalid) {
    return Err(
      new Error(
        `Invalid amount ${invalid.amount} for ${invalid.address}: amounts are positive whole numbers of satoshis`,
      ),
    );
  }
  const dust = recipients.find(({ amount }) => amount < DUST_THRESHOLD);
  return dust
    ? Err(
        new Error(
          `Amount ${dust.amount} for ${dust.address} is below the dust limit of ${DUST_THRESHOLD} satoshis`,
        ),
      )
    : Ok(undefined);
};

const toPaymentFeeRate = (
  feeRate: BitcoinFeeRate,
): Result<BuildBitcoinPaymentParams['feeRate'], Error> => {
  if (feeRate.feeOption !== 'Custom') return Ok(feeRate);
  const customFeeRate = feeRateFromSatsPerVByte(feeRate.satsPerVByte);
  return customFeeRate === undefined
    ? Err(
        new Error(
          `Invalid fee rate ${feeRate.satsPerVByte}: custom rates are positive numbers of satoshis per virtual byte, at most 10,000`,
        ),
      )
    : Ok({ feeOption: 'Custom', customFeeRate });
};

/**
 * Builds an unsigned Bitcoin payment from the account's synced UTxOs. Outputs
 * spent by the account's pending transactions are not spent again, and the
 * change goes back to the account. The account is `props.accountId`, or the
 * only Bitcoin account on the active network.
 *
 * The account must have synced first: await
 * {@link waitForBitcoinAccountSync} after adding the wallet. A Bitcoin
 * account must be loaded by at most one wallet per JavaScript realm, since
 * the account's synced state is shared across the realm by account id.
 *
 * @param wallet - A wallet holding the paying account (see
 *   {@link WalletWithBitcoinTxBuilding}).
 * @param props - The recipients, with amounts in satoshis, the fee rate, and
 *   the account and memo when needed.
 * @returns `Ok` with the unsigned transaction and its fee, or `Err` when an
 *   amount is not a positive whole number of satoshis or is below the dust
 *   limit of 546 satoshis, a custom fee rate is out of range, no account
 *   matches, the account has not started syncing, or the payment cannot be
 *   built, for example when the funds do not cover it. It never rejects.
 */
export const buildBitcoinTx = async (
  wallet: WalletWithBitcoinTxBuilding,
  props: BuildBitcoinTxProps,
): Promise<Result<UnsignedBitcoinTx, Error>> => {
  const { accountId: requestedAccountId, recipients, feeRate, memo } = props;

  try {
    const validRecipients = validateRecipients(recipients);
    if (validRecipients.isErr()) return Err(validRecipients.error);
    const paymentFeeRate = toPaymentFeeRate(feeRate);
    if (paymentFeeRate.isErr()) return Err(paymentFeeRate.error);

    const accountId = await resolveBitcoinAccountId(
      wallet.stateObservables,
      requestedAccountId,
    );
    if (accountId.isErr()) return Err(accountId.error);

    const accountWallet = findBitcoinAccountWallet(accountId.value);
    if (accountWallet.isErr()) return Err(accountWallet.error);

    const pendingActivities = await firstValueFrom(
      wallet.stateObservables.activities.selectPendingActivitiesByAccount$,
    );

    const { serializedTx, fee } = await buildBitcoinPayment({
      wallet: accountWallet.value,
      pendingActivities: pendingActivities[accountId.value] ?? [],
      outputs: recipients,
      feeRate: paymentFeeRate.value,
      memo,
    });
    return Ok({ serializedTx, fee });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Returns a promise that resolves once a Bitcoin account is on the active
 * network and has synced its UTxOs with the provider. Await it after adding
 * a wallet, before {@link buildBitcoinTx}, so the build sees the account's
 * funds. A Bitcoin account must be loaded by at most one wallet per
 * JavaScript realm: with two, the promise may resolve on the other wallet's
 * sync.
 *
 * @param wallet - A wallet holding the account (see
 *   {@link WalletWithBitcoinTxBuilding}).
 * @param options - Optional configuration.
 * @returns A promise that resolves once the account has synced.
 * @throws A `TimeoutError` when the account has not synced within
 *   `options.timeout`.
 */
export const waitForBitcoinAccountSync = async (
  wallet: WalletWithBitcoinTxBuilding,
  options?: {
    /**
     * Bitcoin account to wait for. Required when more than one Bitcoin
     * account is present on the active network: without it the promise waits
     * until exactly one is.
     */
    accountId?: AccountId;
    /**
     * Maximum time to wait before rejecting with a `TimeoutError`. When
     * omitted the promise waits indefinitely.
     */
    timeout?: Milliseconds;
  },
): Promise<void> => {
  const { wallets, network } = wallet.stateObservables;

  await firstValueFrom(
    combineLatest([
      wallets.selectAll$,
      network.selectAllActiveNetworkIds$,
    ]).pipe(
      map(([allWallets, activeNetworkIds]) =>
        resolveBitcoinAccount(allWallets, activeNetworkIds, options?.accountId),
      ),
      filter(resolved => resolved.isOk()),
      map(resolved => resolved.unwrap().account.accountId),
      take(1),
      switchMap(accountId =>
        bitcoinAccountWallets$.pipe(
          map(accountWallets => accountWallets[accountId]),
        ),
      ),
      filter(
        (accountWallet): accountWallet is BitcoinWallet => !!accountWallet,
      ),
      switchMap(accountWallet => accountWallet.syncStatus$),
      filter(({ status }) => status === SyncStatus.Synced),
      options?.timeout != null
        ? timeout({ first: options.timeout })
        : passthrough(),
    ),
  );
};

const passthrough =
  <T>() =>
  (source$: Observable<T>) =>
    source$;

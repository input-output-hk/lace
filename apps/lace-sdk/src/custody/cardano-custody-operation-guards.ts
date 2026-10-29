import { utxoKey } from '@lace-contract/cardano-context';
import { Err } from '@lace-lib/util';

import {
  CardanoCustodyBuildFailedError,
  CardanoCustodyOperationInProgressError,
  custodyAccountNotLiveError,
} from './cardano-custody-errors';
import { CardanoCustodySponsorError } from './cardano-custody-sponsor';
import {
  readCardanoCustodyAccountState,
  readSettledUtxos,
} from './cardano-custody-wallet';
import { paymentKeyHashOf } from './cardano-custody-witnesses';

import type { CardanoCustodySponsorCollateral } from './cardano-custody-sponsor';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccountState,
  CardanoCustodyCollateralFunding,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';

type LiveCardanoCustodyAccountState = Extract<
  CardanoCustodyAccountState,
  { status: 'live' }
>;

/**
 * The account's live state, refused while it is not live or while its
 * control UTxO is the output of a submitted operation that has not settled:
 * custody operations are never chained, and a grant spend references the
 * settled control UTxO.
 *
 * @throws {@link CardanoCustodyInvalidOperationError} With `account-not-live`,
 *   whose detail names the `status` and, for an `invalid` account, the
 *   `reason`, such as a control state under a logic the SDK does not accept.
 * @throws {@link CardanoCustodyOperationInProgressError}
 */
export const readSettledLiveState = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Promise<LiveCardanoCustodyAccountState> => {
  const state = await readCardanoCustodyAccountState(wallet, accountId);
  if (state?.status !== 'live') throw custodyAccountNotLiveError(state);
  const control = utxoKey(state.controlUtxo);
  const settled = await readSettledUtxos(wallet, accountId);
  if (!settled.some(utxo => utxoKey(utxo) === control)) {
    throw new CardanoCustodyOperationInProgressError(accountId);
  }
  return state;
};

const MAX_VALIDITY_MARGIN_MS = 60_000;

/**
 * The collateral-mode funding of a build made at `now`: the shared
 * collateral, and an upper validity bound inside the sponsor's window less a
 * margin of a minute, or half the window when it is shorter, so the bound
 * still holds when the sponsor checks it.
 */
export const collateralFundingOf = (
  {
    collateralUtxo,
    sponsorAddress,
    validitySeconds,
  }: CardanoCustodySponsorCollateral,
  now: number,
): CardanoCustodyCollateralFunding => {
  const windowMs = validitySeconds * 1000;
  return {
    mode: 'collateral',
    collateralUtxo,
    sponsorAddress,
    validUntil: now + windowMs - Math.min(MAX_VALIDITY_MARGIN_MS, windowMs / 2),
  };
};

/**
 * The sponsor replaced its shared collateral after the build read it. A
 * build on the new collateral can succeed.
 */
export const isSharedCollateralRefusal = (error: unknown): boolean =>
  error instanceof CardanoCustodySponsorError &&
  error.rule === 'uses_shared_collateral';

/**
 * The key the sponsor signs with: the payment key of its address.
 *
 * @throws {@link CardanoCustodyBuildFailedError} With `build-failed` when the
 *   address has no payment key, so no sponsor witness could be accepted.
 *   Checked before any build or witness request.
 */
export const sponsorKeyHashOf = (
  sponsorAddress: Cardano.PaymentAddress,
): Ed25519KeyHashHex => {
  const keyHash = paymentKeyHashOf(sponsorAddress);
  if (!keyHash) {
    throw new CardanoCustodyBuildFailedError({
      code: 'build-failed',
      message: 'The sponsor address has no payment key',
    });
  }
  return keyHash;
};

/**
 * What one custody helper call holds exclusively: the account, for an owner
 * operation, or one grantee's grant of the account, for a grant spend.
 */
type CustodyOperationScope = {
  accountId: AccountId;
  /** Set for a grant spend: spends under other grants may run beside it. */
  grantee?: Ed25519KeyHashHex;
};

const scopeKey = ({ accountId, grantee }: CustodyOperationScope): string =>
  grantee === undefined ? accountId : `${accountId}/${grantee.toLowerCase()}`;

/** The scopes each wallet runs a custody helper call in, by its store. */
const scopesInFlight = new WeakMap<object, Set<string>>();

/**
 * Runs `operation` unless this wallet already runs a custody helper call in
 * the same scope, which refuses it with
 * {@link CardanoCustodyOperationInProgressError}. The pending activity that
 * refuses a second operation exists only once the first is submitted, so
 * without this two calls started together, such as a double click, would
 * both take a sponsor witness and a consent for transactions on one control
 * or grant UTxO, and the chain would refuse one of them. Owner operations
 * and grant spends hold different scopes: an owner operation replaces the
 * control UTxO, which the chain then refuses every unsettled spend for.
 */
export const withExclusiveCustodyOperation = async <T>(
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  scope: CustodyOperationScope,
  operation: () => Promise<Result<T, Error>>,
): Promise<Result<T, Error>> => {
  let scopes = scopesInFlight.get(wallet.stateObservables);
  if (!scopes) {
    scopes = new Set();
    scopesInFlight.set(wallet.stateObservables, scopes);
  }
  const key = scopeKey(scope);
  if (scopes.has(key)) {
    return Err(new CardanoCustodyOperationInProgressError(scope.accountId));
  }
  scopes.add(key);
  try {
    return await operation();
  } finally {
    scopes.delete(key);
  }
};

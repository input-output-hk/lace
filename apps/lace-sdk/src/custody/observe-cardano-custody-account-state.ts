import { distinctUntilChanged, map } from 'rxjs';

import { custodyStateObservables } from './cardano-custody-wallet';

import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Cardano } from '@cardano-sdk/core';
import type { CardanoCustodyAccountState } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * A custody account's state while it is `live`: its one control UTxO, the
 * control state it carries and what the account holds. The `live` member of
 * {@link CardanoCustodyObservedAccountState} extends it.
 */
export type CardanoCustodyLiveAccountState = Extract<
  CardanoCustodyAccountState,
  { status: 'live' }
>;

/**
 * A custody account's state as {@link observeCardanoCustodyAccountState}
 * emits it. A `live` account whose state lists this app's device also names
 * its `depositAddress`.
 */
export type CardanoCustodyObservedAccountState =
  | Exclude<CardanoCustodyAccountState, { status: 'live' }>
  | (CardanoCustodyLiveAccountState & {
      /**
       * Where to deposit funds the account can spend. Present only while the
       * account is `live` and its state lists this app's device.
       */
      readonly depositAddress?: Cardano.PaymentAddress;
    });

/**
 * A deposit stays spendable only once the control UTxO exists, so a
 * `notCreated` or `invalid` account names no deposit address. Neither does
 * an account this app cannot operate: an observer, or a device the state no
 * longer lists.
 */
const withDepositAddress = (
  state: CardanoCustodyAccountState,
): CardanoCustodyObservedAccountState =>
  state.status === 'live' && state.currentDeviceListed === true
    ? { ...state, depositAddress: state.controlUtxo[1].address }
    : state;

/**
 * A custody account's state as the wallet syncs it, from
 * `wallet.stateObservables.cardanoCustody.selectCardanoCustodyAccountState$`.
 * It reads the in-flight view, so a submitted operation's outputs replace
 * the UTxOs it spends at once.
 *
 * The UTxOs at the account address, by who may spend them:
 *
 * - `funds`: plain deposits. Agents spend them within their grants, and
 *   owner operations pay from them.
 * - `reserves`: deposits under an inline datum, which only owner operations
 *   spend. `own` are in the format Lace writes; `foreign` carry another
 *   datum or a reference script, and Lace never selects them.
 * - `grants`: one UTxO per grant, with the grant its datum holds. Their
 *   lovelace, `grantLockedLovelace`, is held until a sweep removes the
 *   grant.
 * - `stranded`: deposits under a datum hash, which cannot be spent.
 * - `anomalies`: UTxOs holding an account token in a shape the contract
 *   rules out; none is ever spent.
 *
 * A `live` account also names its `controlUtxo` and `state` (the logic it
 * runs, devices, grant generation, next slot, revoked slots and outstanding
 * grants). Its control output holds `controlMinimumLovelace`, locked for
 * the account's life, and `controlHeadroomLovelace` above it: the owner fee
 * reserve, which pays an owner operation's fee when funds and reserves
 * cannot. Agents never reach it. `withdrawableRewards` only a listed device
 * withdraws. The stake deposit is counted nowhere.
 *
 * `status` is `notCreated` before the creation settles, `live` with one
 * readable control state under a logic in `CARDANO_CUSTODY_LOGIC_HASHES`
 * (`currentDeviceListed` says whether this app's device has owner
 * authority), or `invalid` with a `reason`; the reason `unknown-logic`
 * names a logic the SDK does not accept, and the holdings still count.
 * Only a `live` account whose state lists this app's device names a
 * `depositAddress`: offer deposits only while it is present. It emits
 * `undefined` while nothing is known of the account's UTxOs or its
 * network's protocol parameters, and for an id that names no custody
 * account.
 *
 * @param wallet - A wallet holding the account.
 * @param accountId - An owner or observer custody account the wallet holds.
 * @returns An observable that emits the account's state on every change.
 */
export const observeCardanoCustodyAccountState = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Observable<CardanoCustodyObservedAccountState | undefined> =>
  custodyStateObservables(wallet).selectCardanoCustodyAccountState$.pipe(
    map(stateOf => stateOf(accountId)),
    distinctUntilChanged(),
    map(state => state && withDepositAddress(state)),
  );

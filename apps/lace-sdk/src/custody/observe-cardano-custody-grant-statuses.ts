import { distinctUntilChanged, map } from 'rxjs';

import { custodyStateObservables } from './cardano-custody-wallet';

import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { CardanoCustodyGrantWithStatus } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * Every grant UTxO of a custody account with where its grant stands, in
 * slot order, from
 * `wallet.stateObservables.cardanoCustody.selectCardanoCustodyGrantStatuses$`.
 * Each entry carries the grant UTxO, the grant its datum holds and its
 * token, and `status`:
 *
 * - `pending`: an operation this wallet submitted issues it and has not
 *   settled.
 * - `live`: confirmed, current, and able to pay the smallest spend.
 * - `exhausted`: confirmed and current, but its remaining caps cannot pay
 *   the smallest spend: one output to the cheapest allowed address plus the
 *   default grant fee bound.
 * - `expired`: its expiry is at or before the chain tip's time.
 * - `revoked`, `superseded`: a confirmed revocation, or revoke-all, stopped
 *   it.
 * - `revoking`, `sweeping`: a submitted operation that has not settled
 *   revokes it, or burns its token.
 *
 * Every grant counts toward the account's 16 outstanding grants until a
 * sweep burns it, whatever its status. An agent's spend that has not
 * settled shows its lowered caps at once. Expiry is judged at the synced
 * chain tip's time, not the device clock. It emits `undefined` while the
 * account is not live, while nothing is known of its UTxOs, the tip or its
 * network's protocol parameters, and for an id that names no custody
 * account.
 */
export const observeCardanoCustodyGrantStatuses = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Observable<CardanoCustodyGrantWithStatus[] | undefined> =>
  custodyStateObservables(wallet).selectCardanoCustodyGrantStatuses$.pipe(
    map(statusesOf => statusesOf(accountId)),
    distinctUntilChanged(),
  );

import { APIError, APIErrorCode } from '../api-error';

import type { NetworkBindingRefusal } from './utils/network-binding';
import type { AccountUtxoMap } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Whether a `'states-no-network'` verdict rests on evidence the wallet never
 * gathered, rather than on evidence saying the inputs are not ours.
 *
 * The account's key is absent from the map until the first fetch writes it,
 * and present-but-empty afterwards. Only this one verdict consults ownership
 * at all, so every other one stands whatever state the map is in.
 */
export const isVerdictOnUnfetchedOwnership = (
  verdict: NetworkBindingRefusal | 'undecodable' | null,
  ownershipUtxos: AccountUtxoMap,
  accountId: AccountId,
): boolean =>
  verdict === 'states-no-network' && !Object.hasOwn(ownershipUtxos, accountId);

/**
 * The answer for that state: retryable, and NOT a refusal — no rule reached a
 * finding, so there is nothing to show the user and nothing for the dApp to
 * correct in its transaction.
 */
export const ownershipNotReadyError = (): APIError =>
  new APIError(
    APIErrorCode.InternalError,
    'Wallet UTxOs not ready; retry once the wallet has synced',
  );

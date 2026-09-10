import { Cardano } from '@cardano-sdk/core';
import { extractPaymentCredential } from '@lace-contract/cardano-context';
import {
  isNotFoundError,
  PROVIDER_REQUEST_RETRY_CONFIG,
} from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import { combineLatest, defer, map, of } from 'rxjs';

import { uniqueRewardAccounts } from './unique-reward-accounts';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoProvider,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

/**
 * Whether the sweep must drop this UTxO because its payment credential is a
 * script. This is the one unspendable shape no pre-submit guard rejects, and so
 * the only class disclosed to the user. Defined once on purpose: two copies of
 * the rule that decides what a user is told about their money would drift.
 */
export const isScriptUtxo = (utxo: Cardano.Utxo): boolean =>
  extractPaymentCredential(utxo[1].address)?.type ===
  Cardano.CredentialType.ScriptHash;

/**
 * Script-credential UTxOs currently under the given account's stake keys.
 *
 * No ownership test is needed: a script credential is never an owned key hash,
 * so every script UTxO the stake-scoped fetch returns is one the sweep drops.
 *
 * Account 0's swept set comes from the synced store, which holds only the
 * already-filtered UTxOs, so its dropped set is unrecoverable from state and has
 * to be read back from the provider. Without this the review screen discloses
 * nothing for a single-account wallet, the common shape.
 *
 * A failed fetch errors rather than degrading to 0. Zero and "we could not
 * check" render as the same absent row, and the row only appears when the count
 * is nonzero — so a swallowed failure reads as an all-clear on the screen that
 * then tells the user to treat the old phrase as compromised. Erroring routes it
 * through run-discovery's retryable failure, which is how the account scan
 * already treats the same provider and the same call. A never-seen stake address
 * 404s to empty, which is an answer, not a failure.
 */
export const countScriptUtxos$ = (
  addresses: GroupedAddress[],
  chainId: Cardano.ChainId,
  cardanoProvider: CardanoProvider,
): Observable<number> => {
  const rewardAccounts = uniqueRewardAccounts(addresses);
  if (rewardAccounts.length === 0) return of(0);

  // defer must wrap the call, not sit outside it: the provider builds its
  // observable from an already-in-flight request that replays its settled value,
  // so the retry re-issues only because re-subscribing re-invokes this factory.
  const countUnder = (rewardAccount: CardanoRewardAccount) =>
    defer(() =>
      cardanoProvider.getAccountUtxos({ rewardAccount }, { chainId }),
    ).pipe(
      map(result => {
        if (result.isErr()) {
          // A stake address the chain has never seen 404s. That is "none",
          // not "unknown", and must not fail the migration.
          if (isNotFoundError(result.unwrapErr())) return 0;
          throw result.unwrapErr();
        }
        return result.unwrap().filter(isScriptUtxo).length;
      }),
      // A missing or synchronously-throwing provider method fails here rather
      // than escaping the subscription, but pays the full backoff first:
      // carrying no `reason`, isRetriableError classifies it retriable.
      retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
    );

  return combineLatest(rewardAccounts.map(countUnder)).pipe(
    map(counts => counts.reduce((sum, count) => sum + count, 0)),
  );
};

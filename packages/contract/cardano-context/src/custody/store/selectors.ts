import { createSlotTimeCalc } from '@cardano-sdk/core';
import { markParameterizedSelector } from '@lace-contract/module';
import { createSelector } from '@reduxjs/toolkit';

import { selectCardanoCustodyAccounts } from '../../extensions/custody-account-ids';
import { CardanoNetworkId } from '../../value-objects';
import { classifyCardanoCustodyAccount } from '../account-state';
import { classifyCardanoCustodyGrants } from '../grant-status';
import { verifyCardanoCustodyAccountIdentity } from '../identity';

import type { CardanoContextCoreSelectors } from '../../extensions/core-selectors';
import type {
  RequiredProtocolParameters,
  RewardAccountDetails,
} from '../../types';
import type { CardanoCustodyAccount } from '../account';
import type { CardanoCustodyAccountState } from '../account-state';
import type { CardanoCustodyGrantWithStatus } from '../grant-status';
import type { Cardano } from '@cardano-sdk/core';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * The custody account selectors: `selectCardanoCustodyAccountState`,
 * `selectSettledCardanoCustodyAccountState` and
 * `selectCardanoCustodyGrantStatuses`, built on the Cardano context's core
 * selectors.
 */
export const createCardanoCustodySelectors = (
  core: CardanoContextCoreSelectors,
) => {
  // Per-account inputs keep the classification below from recomputing when
  // only another account's UTxOs or rewards change.
  const selectCardanoCustodyAccount = createSelector(
    selectCardanoCustodyAccounts,
    (_: unknown, accountId: AccountId) => accountId,
    (custodyAccounts, accountId) =>
      custodyAccounts.find(account => account.accountId === accountId),
  );

  // The stored identity is derived again whenever the account changes, so UTxOs
  // at an address the contract does not govern for it are never its own.
  const selectVerifiedCardanoCustodyAccount = createSelector(
    selectCardanoCustodyAccount,
    (account): CardanoCustodyAccount | undefined =>
      account &&
      verifyCardanoCustodyAccountIdentity(account.blockchainSpecific).ok
        ? account
        : undefined,
  );

  const selectAccountUtxosWithInFlightOf = createSelector(
    core.selectAccountUtxosWithInFlight,
    (_: unknown, accountId: AccountId) => accountId,
    (utxosByAccount, accountId): Cardano.Utxo[] | undefined =>
      utxosByAccount[accountId],
  );

  const selectRewardAccountDetailsOf = createSelector(
    core.selectRewardAccountDetails,
    (_: unknown, accountId: AccountId) => accountId,
    (detailsByAccount, accountId): RewardAccountDetails | undefined =>
      detailsByAccount[accountId],
  );

  // The custody account's own network prices its control output, whichever
  // network is active.
  const selectCardanoCustodyProtocolParameters = createSelector(
    core.selectAllNetworkInfo,
    selectVerifiedCardanoCustodyAccount,
    (networkInfo, account): RequiredProtocolParameters | undefined =>
      account &&
      networkInfo[
        CardanoNetworkId(account.blockchainSpecific.chainId.networkMagic)
      ]?.protocolParameters,
  );

  /**
   * Classifies a Cardano custody account's UTxOs into its control state,
   * grants, reserves, plain funds and stranded deposits, with the control
   * output's minimum and headroom (see {@link CardanoCustodyAccountState}). It
   * reads the in-flight view, so a submitted operation's outputs replace the
   * UTxOs it spends at once.
   *
   * `undefined` when the id names no custody account, when the account's
   * stored identity is not the one its contract derives, while nothing is
   * known of its UTxOs, from a fetch or a pending transaction, or while the
   * protocol parameters of its network are unknown: unknown UTxOs do not make
   * an account `notCreated`.
   */
  /* eslint-disable max-params */
  const selectCardanoCustodyAccountState = markParameterizedSelector(
    createSelector(
      selectVerifiedCardanoCustodyAccount,
      selectAccountUtxosWithInFlightOf,
      selectRewardAccountDetailsOf,
      selectCardanoCustodyProtocolParameters,
      (
        account,
        utxos,
        rewardAccountDetails,
        protocolParameters,
      ): CardanoCustodyAccountState | undefined =>
        account && utxos && protocolParameters
          ? classifyCardanoCustodyAccount({
              account: account.blockchainSpecific,
              utxos,
              withdrawableRewards: BigInt(
                rewardAccountDetails?.rewardAccountInfo.withdrawableAmount ?? 0,
              ),
              protocolParameters,
            })
          : undefined,
    ),
  );
  /* eslint-enable max-params */

  const selectAccountUtxosOf = createSelector(
    core.selectAccountUtxos,
    (_: unknown, accountId: AccountId) => accountId,
    (utxosByAccount, accountId): Cardano.Utxo[] | undefined =>
      utxosByAccount[accountId],
  );

  // The confirmed classification: settled UTxOs only, without the in-flight
  // adjustments of submitted operations.
  const selectSettledCardanoCustodyAccountState = markParameterizedSelector(
    createSelector(
      selectVerifiedCardanoCustodyAccount,
      selectAccountUtxosOf,
      selectCardanoCustodyProtocolParameters,
      (
        account,
        utxos,
        protocolParameters,
      ): CardanoCustodyAccountState | undefined =>
        account && utxos && protocolParameters
          ? classifyCardanoCustodyAccount({
              account: account.blockchainSpecific,
              utxos,
              withdrawableRewards: 0n,
              protocolParameters,
            })
          : undefined,
    ),
  );

  /**
   * The time of the chain tip, in POSIX milliseconds: the start of its slot.
   * Undefined until both the tip and the era history are known, or when the
   * era history does not cover the tip.
   */
  const selectTipTime = createSelector(
    core.selectTip,
    core.selectEraSummaries,
    (tip, eraSummaries): number | undefined => {
      if (!tip || !eraSummaries || eraSummaries.length === 0) return undefined;
      try {
        return createSlotTimeCalc(eraSummaries)(tip.slot).getTime();
      } catch {
        return undefined;
      }
    },
  );

  /**
   * The status of every grant UTxO of a Cardano custody account, in slot
   * order (see {@link CardanoCustodyGrantWithStatus}). Statuses come from the
   * grant UTxOs and control state on chain, against those of the in-flight
   * view: `pending` while a submitted operation that issues the grant has not
   * settled, `revoking` or `sweeping` while one that revokes or burns it has
   * not. A grant spend that has not settled shows its lowered caps at once.
   * Expiry is judged at the chain tip's time, so it moves with the synced
   * chain, not the device clock. `exhausted` is judged with the protocol
   * parameters of the account's network and the default grant fee bound.
   *
   * `undefined` while the account is not live in the in-flight view, while
   * nothing is known of its UTxOs, and until the tip's time and the protocol
   * parameters are known.
   */
  /* eslint-disable max-params */
  const selectCardanoCustodyGrantStatuses = markParameterizedSelector(
    createSelector(
      selectSettledCardanoCustodyAccountState,
      selectCardanoCustodyAccountState,
      selectCardanoCustodyProtocolParameters,
      selectVerifiedCardanoCustodyAccount,
      selectTipTime,
      (
        confirmed,
        inFlight,
        protocolParameters,
        account,
        now,
      ): CardanoCustodyGrantWithStatus[] | undefined =>
        inFlight?.status === 'live' &&
        account &&
        protocolParameters &&
        now !== undefined
          ? classifyCardanoCustodyGrants({
              confirmed:
                confirmed?.status === 'live'
                  ? { state: confirmed.state, grants: confirmed.grants }
                  : undefined,
              inFlight: { state: inFlight.state, grants: inFlight.grants },
              now,
              protocolParameters,
              networkId: account.blockchainSpecific.chainId.networkId,
            })
          : undefined,
    ),
  );
  /* eslint-enable max-params */

  return {
    selectCardanoCustodyAccountState,
    selectSettledCardanoCustodyAccountState,
    selectCardanoCustodyGrantStatuses,
  };
};

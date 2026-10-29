import { Cardano } from '@cardano-sdk/core';
import {
  extractUniqueStakeKeys,
  isCardanoAddress,
  pendingRewardWithdrawalKey,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  PendingRewardWithdrawals,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

export type RewardWithdrawal = {
  rewardAccount: Cardano.RewardAccount;
  /** The whole reward balance: the ledger allows withdrawing all of it or none. */
  amount: bigint;
};

/**
 * The reward balance an ordinary send may withdraw, or `undefined` when the
 * ledger would refuse the withdrawal and the send must stay UTxO-funded.
 *
 * The reward account is the first stake key among the account's addresses:
 * the key the reward details were fetched for, and the one the signer finds a
 * derivation path for.
 */
export const resolveRewardWithdrawal = ({
  accountId,
  accountAddresses,
  rewardAccountDetails,
  pendingRewardWithdrawals,
  networkMagic,
}: {
  accountId: AccountId;
  accountAddresses: AnyAddress[];
  rewardAccountDetails: AccountRewardAccountDetailsMap;
  pendingRewardWithdrawals: PendingRewardWithdrawals;
  /** The network the transaction is built for. */
  networkMagic: Cardano.NetworkMagic;
}): RewardWithdrawal | undefined => {
  const info = rewardAccountDetails[accountId]?.rewardAccountInfo;
  const [stakeKey] = extractUniqueStakeKeys(
    accountAddresses.filter(isCardanoAddress),
  );
  if (!info || !stakeKey) return undefined;

  // A pending transaction already withdraws these rewards. Until it settles,
  // the fetched balance is stale and the on-chain one unknown, and the ledger
  // only accepts the whole balance, so no amount here would be valid.
  const pending = pendingRewardWithdrawals.get(
    pendingRewardWithdrawalKey(networkMagic, Cardano.RewardAccount(stakeKey)),
  );
  if (pending !== undefined && pending > 0n) return undefined;

  const amount = BigNumber.valueOf(info.withdrawableAmount);
  // Conway refuses a withdrawal from an unregistered stake key, and from one
  // whose voting power is not delegated to any DRep
  // (ConwayWdrlNotDelegatedToDRep).
  if (amount <= 0n || !info.isRegistered || !info.drepId) return undefined;

  // A script stake credential needs a script witness, which a send does not
  // carry.
  const stakeCredential = Cardano.Address.fromString(stakeKey)
    ?.asReward()
    ?.getPaymentCredential();
  if (stakeCredential?.type !== Cardano.CredentialType.KeyHash)
    return undefined;

  return { amount, rewardAccount: Cardano.RewardAccount(stakeKey) };
};

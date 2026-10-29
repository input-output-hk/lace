import { ActivityType } from '@lace-contract/activities';
import { BigNumber } from '@lace-lib/util';

import { extractUniqueStakeKeys } from './store/helpers/extract-unique-stake-keys';
import { isCardanoAddress } from './util';

import type { CardanoActivityUtxoMetadata } from './augmentations';
import type {
  AccountRewardAccountDetailsMap,
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from './types';
import type { Cardano } from '@cardano-sdk/core';
import type {
  Activity,
  BlockchainSpecificActivityMetadata,
} from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

const outpointKey = (ref: { txId: Cardano.TransactionId; index: number }) =>
  `${ref.txId}#${ref.index}`;

const getCardanoInFlight = (
  activity: Activity,
): CardanoActivityUtxoMetadata | undefined => {
  if (activity.type !== ActivityType.Pending) return undefined;
  const blockchainSpecific = activity.blockchainSpecific as
    | BlockchainSpecificActivityMetadata
    | undefined;
  return blockchainSpecific?.Cardano;
};

/**
 * Every own output of the account's not-yet-settled transactions, deduped by
 * outpoint. Additive only: unlike {@link applyInFlightUtxoAdjustments} it does
 * NOT drop outputs a later pending transaction consumes, because an outpoint
 * our own pending transaction spends still exists on chain and can still be
 * named as collateral by someone else.
 *
 * Deliberately not reused by `applyInFlightUtxoAdjustments`: spendability and
 * ownership answer different questions, so that function must drop an output
 * a later pending transaction consumes while this one must keep it. Reworking
 * its event ordering to share this code would change the spendable view for no
 * gain here.
 */
export const ownPendingOutputs = (
  pendingActivities: readonly Activity[],
  accountAddresses: readonly CardanoPaymentAddress[],
): Cardano.Utxo[] => {
  const ownAddresses = new Set<string>(accountAddresses);
  const byOutpoint = new Map<string, Cardano.Utxo>();

  for (const activity of pendingActivities) {
    const inFlight = getCardanoInFlight(activity);
    if (!inFlight) continue;
    for (const utxo of inFlight.producedOutputs) {
      if (ownAddresses.has(utxo[1].address)) {
        byOutpoint.set(outpointKey(utxo[0]), utxo);
      }
    }
  }

  return [...byOutpoint.values()];
};

export const applyInFlightUtxoAdjustments = (
  availableUtxo: Cardano.Utxo[],
  accountAddresses: readonly CardanoPaymentAddress[],
  pendingActivities: readonly Activity[],
): Cardano.Utxo[] => {
  let hasAnyEffect = false;
  for (const activity of pendingActivities) {
    const inFlight = getCardanoInFlight(activity);
    if (
      inFlight &&
      (inFlight.consumedInputs.length > 0 ||
        inFlight.producedOutputs.length > 0)
    ) {
      hasAnyEffect = true;
      break;
    }
  }
  if (!hasAnyEffect) return availableUtxo;

  const ownAddresses = new Set<string>(accountAddresses);
  const chronological = [...pendingActivities].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  let result: Cardano.Utxo[] = [...availableUtxo];

  for (const activity of chronological) {
    const inFlight = getCardanoInFlight(activity);
    if (!inFlight) continue;

    if (inFlight.consumedInputs.length > 0) {
      const spent = new Set(inFlight.consumedInputs.map(outpointKey));
      if (spent.size > 0) {
        result = result.filter(([utxoIn]) => !spent.has(outpointKey(utxoIn)));
      }
    }

    if (inFlight.producedOutputs.length > 0) {
      // Dedupe against existing UTxOs: between the chain refresh that adds the
      // newly-confirmed outputs and the activity poll that flips Pending→Send/Receive,
      // the same outpoint can already be present in `result`. Without this guard
      // we'd append a second copy and inflate the available set.
      const existingOutpoints = new Set(
        result.map(([utxoIn]) => outpointKey(utxoIn)),
      );
      const ownProduced = inFlight.producedOutputs.filter(
        ([utxoIn, txOut]) =>
          ownAddresses.has(txOut.address) &&
          !existingOutpoints.has(outpointKey(utxoIn)),
      );
      if (ownProduced.length > 0) {
        result = [...result, ...ownProduced];
      }
    }
  }

  return result;
};

/** Rewards pending transactions withdraw, keyed by
 * {@link pendingRewardWithdrawalKey}. */
export type PendingRewardWithdrawals = ReadonlyMap<string, bigint>;

/**
 * Identifies a reward account on one network. Preview and Preprod share
 * reward addresses (both are network id 0), so the address alone would let
 * one network's pending withdrawal affect the other's balance (ADR 11).
 */
export const pendingRewardWithdrawalKey = (
  networkMagic: Cardano.NetworkMagic,
  rewardAccount: Cardano.RewardAccount | CardanoRewardAccount,
): string => `${networkMagic}:${rewardAccount}`;

/** Each account's network, from the first of its addresses that records it. */
const networkMagicByAccount = (
  allAddresses: readonly AnyAddress[],
): Map<string, Cardano.NetworkMagic> => {
  const networks = new Map<string, Cardano.NetworkMagic>();
  for (const address of allAddresses) {
    if (!isCardanoAddress(address) || networks.has(address.accountId)) continue;
    const networkMagic = address.data?.networkMagic;
    if (networkMagic !== undefined)
      networks.set(address.accountId, networkMagic);
  }
  return networks;
};

/**
 * Rewards withdrawn by not-yet-settled transactions, keyed by
 * {@link pendingRewardWithdrawalKey}.
 *
 * Read across every account's pending activities, not only the reward
 * owner's: a transaction recorded for one account can withdraw another own
 * account's rewards (a migration's destination row, a dApp transaction funded
 * by another account). A transaction recorded for several accounts counts
 * once. An account whose network is unknown is skipped rather than guessed.
 */
export const pendingRewardWithdrawals = (
  pendingActivitiesByAccount: Readonly<Record<string, readonly Activity[]>>,
  allAddresses: readonly AnyAddress[],
): PendingRewardWithdrawals => {
  const networks = networkMagicByAccount(allAddresses);
  const counted = new Set<string>();
  const totals = new Map<string, bigint>();
  for (const [accountId, activities] of Object.entries(
    pendingActivitiesByAccount,
  )) {
    const networkMagic = networks.get(accountId);
    if (networkMagic === undefined) continue;
    for (const activity of activities) {
      const withdrawals = getCardanoInFlight(activity)?.withdrawals;
      const transactionKey = `${networkMagic}:${activity.activityId}`;
      if (!withdrawals?.length || counted.has(transactionKey)) continue;
      counted.add(transactionKey);
      for (const { stakeAddress, quantity } of withdrawals) {
        const key = pendingRewardWithdrawalKey(networkMagic, stakeAddress);
        totals.set(key, (totals.get(key) ?? 0n) + quantity);
      }
    }
  }
  return totals;
};

/**
 * The BALANCE view of each account's reward details: the withdrawable amount
 * minus the rewards pending transactions already moved into their outputs, so
 * the ADA balance counts them once. Only the withdrawable amount changes, and
 * never below zero. Never use the result as a withdrawal amount: the ledger
 * only accepts the whole on-chain balance, which a subtracted residual is not.
 *
 * The reward account is the account's first stake key, the one its reward
 * details were fetched for, on the account's own network. Returns `details`
 * itself when nothing changes, and keeps every unaffected account's object.
 */
export const applyPendingRewardWithdrawals = (
  details: AccountRewardAccountDetailsMap,
  pending: PendingRewardWithdrawals,
  allAddresses: readonly AnyAddress[],
): AccountRewardAccountDetailsMap => {
  if (pending.size === 0) return details;
  const networks = networkMagicByAccount(allAddresses);
  let adjusted: AccountRewardAccountDetailsMap | undefined;
  for (const [accountId, accountDetails] of Object.entries(details)) {
    const networkMagic = networks.get(accountId);
    const [stakeKey] = extractUniqueStakeKeys(
      allAddresses
        .filter(isCardanoAddress)
        .filter(address => address.accountId === accountId),
    );
    if (networkMagic === undefined || stakeKey === undefined) continue;
    const reserved = pending.get(
      pendingRewardWithdrawalKey(networkMagic, stakeKey),
    );
    if (!reserved) continue;
    const withdrawable = BigNumber.valueOf(
      accountDetails.rewardAccountInfo.withdrawableAmount,
    );
    const remaining = withdrawable > reserved ? withdrawable - reserved : 0n;
    if (remaining === withdrawable) continue;
    adjusted ??= { ...details };
    adjusted[accountId as AccountId] = {
      ...accountDetails,
      rewardAccountInfo: {
        ...accountDetails.rewardAccountInfo,
        withdrawableAmount: BigNumber(remaining),
      },
    };
  }
  return adjusted ?? details;
};

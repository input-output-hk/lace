import { BigNumber } from '@lace-lib/util';

import { blockedWithdrawableRewards } from './blocked-withdrawable-rewards';

import type { Cardano } from '@cardano-sdk/core';
import type { RewardAccountInfo } from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';

/**
 * Result of the dry build, fed to {@link evaluateSweepability}. `built: false`
 * means the build failed to balance (an InputSelectionError) OR was skipped
 * because a cheaper pre-build gate already refuses. Either way a higher-priority
 * gate handles it, so a placeholder is safe.
 */
export type SweepBuildOutcome =
  | { built: false }
  | { built: true; fee: bigint; chunkCount: number };

export type SweepVerdict =
  | {
      kind: 'refuse';
      errorKey: TranslationKey;
      amount?: { value: string; labelKey: TranslationKey };
    }
  | { kind: 'proceed'; estimatedFee: bigint; chunkCount: number };

const hasAnythingToSweep = (
  utxos: Cardano.Utxo[],
  rewardInfos: readonly RewardAccountInfo[],
): boolean =>
  utxos.length > 0 ||
  rewardInfos.some(
    info =>
      info.isRegistered || BigNumber.valueOf(info.withdrawableAmount) > 0n,
  );

const sumWithdrawable = (rewardInfos: readonly RewardAccountInfo[]): bigint =>
  rewardInfos.reduce(
    (total, info) => total + BigNumber.valueOf(info.withdrawableAmount),
    0n,
  );

const sumUtxoCoins = (utxos: Cardano.Utxo[]): bigint =>
  utxos.reduce((total, [, txOut]) => total + txOut.value.coins, 0n);

// The value discovery found that a refusal leaves behind, disclosed on the
// refusal screen (D2 cases 3 and 6) so the user sees what could not move.
//
// Zero discloses nothing: the screen renders the card whenever an amount is
// present, and a source holding only a registered stake key has nothing in this
// figure (see the deposit note below), so returning one would read "0 ADA
// can't move yet".
const stuckAmount = (
  value: bigint,
): { value: string; labelKey: TranslationKey } | undefined =>
  value > 0n
    ? { value: `${value}`, labelKey: 'migrate-wallet.unsupported.stuck-amount' }
    : undefined;

/**
 * The single home for sweep-refusal priority. Owns which refusal wins, not the
 * lazy build sequencing: the caller must skip the async build when a pre-build
 * gate already refuses, so a build failure cannot flip a refusal into a
 * retryable one. Every refuse branch is terminal.
 */
export const evaluateSweepability = (
  {
    utxos,
    rewardInfos,
    delegationReserve = 0n,
  }: {
    utxos: Cardano.Utxo[];
    rewardInfos: readonly RewardAccountInfo[];
    /**
     * Lovelace the destination must still hold after the sweep to pay for its
     * own delegation — the stake-key deposit plus that transaction's fee. Zero
     * when no delegation will run, which makes this gate inert.
     */
    delegationReserve?: bigint;
  },
  buildOutcome: SweepBuildOutcome,
): SweepVerdict => {
  const blocked = blockedWithdrawableRewards(rewardInfos);
  if (blocked > 0n) {
    return {
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
      amount: {
        value: `${blocked}`,
        labelKey: 'migrate-wallet.unsupported.stuck-rewards',
      },
    };
  }

  if (!hasAnythingToSweep(utxos, rewardInfos)) {
    return { kind: 'proceed', estimatedFee: 0n, chunkCount: 0 };
  }

  if (utxos.length === 0) {
    // No UTxO to anchor a fee: the stranded value is the stake deposit(s) plus
    // any rewards a single-tx sweep cannot reach.
    return {
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.no-spendable-input',
      amount: stuckAmount(sumWithdrawable(rewardInfos)),
    };
  }

  if (!buildOutcome.built) {
    // Holds value but cannot cover fee plus min-ADA: disclose the ADA found
    // and the withdrawable rewards, matching what no-spendable-input discloses
    // so the two refusals name the same classes.
    //
    // The stake-key deposit is deliberately NOT in either figure. The sweep
    // never claims it — no deregistration certificate, by design (FR-5) — so it
    // is stuck whatever the refusal says, and counting it made the number argue
    // against the reason above it: 1.5 ADA spendable under a registered key
    // read "3.5 ADA can't move yet" directly above "does not have enough ADA to
    // cover the transaction fee".
    return {
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.cannot-cover-fee',
      amount: stuckAmount(sumUtxoCoins(utxos) + sumWithdrawable(rewardInfos)),
    };
  }

  // What arrives has to cover the destination's own delegation as well as the
  // sweep. Checked here rather than left to fail later because the failure
  // lands AFTER the money has moved: the sweep succeeds, the delegation cannot
  // build, and the user ends migrated-but-undelegated — the exact state the
  // condition of use exists to prevent. Refusing keeps the funds where the
  // user can still add to them and retry.
  const arriving =
    sumUtxoCoins(utxos) + sumWithdrawable(rewardInfos) - buildOutcome.fee;
  if (arriving < delegationReserve) {
    return {
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.cannot-cover-delegation',
      amount: stuckAmount(arriving > 0n ? arriving : 0n),
    };
  }

  return {
    kind: 'proceed',
    estimatedFee: buildOutcome.fee,
    chunkCount: buildOutcome.chunkCount,
  };
};

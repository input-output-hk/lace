import { ADA_DECIMALS } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';

import type {
  AccountRewardAccountDetailsMap,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Number of significant figures the per-account voting power is rounded to
 * before it leaves the wallet as a PostHog person property. Single lever for
 * the precision/privacy trade-off: raise to retain precision, lower for more
 * privacy and less `identify` churn.
 */
export const VOTING_POWER_SIGNIFICANT_FIGURES = 3;

// Sentinel DRep ids for the CIP-1694 special voting options. Duplicated from
// @lace-contract/governance-center per ADR 14 (duplicate trivial protocol-stable
// constants rather than couple the always-on analytics module to a feature
// module); do not import.
const DREP_ALWAYS_ABSTAIN = 'drep_always_abstain';
const DREP_ALWAYS_NO_CONFIDENCE = 'drep_always_no_confidence';

export type CardanoGovernanceAccount = {
  accountId: string;
  delegatedTo: string | null;
  votingPower: number;
};

/**
 * Convert a controlled-stake amount (lovelace, as the @lace-lib/util BigNumber
 * value object — a serialized bigint) to ADA and round to `figures` significant
 * figures. Returns 0 for zero/negative/non-finite input.
 */
export const approximateVotingPower = (
  controlledAmountLovelace: RewardAccountInfo['controlledAmount'],
  figures: number = VOTING_POWER_SIGNIFICANT_FIGURES,
): number => {
  const ada =
    Number(BigNumber.valueOf(controlledAmountLovelace)) / 10 ** ADA_DECIMALS;
  if (!Number.isFinite(ada) || ada <= 0) return 0;
  return Number(ada.toPrecision(figures));
};

const toDelegatedTo = (drepId: string | undefined): string | null => {
  if (drepId === undefined) return null;
  if (drepId === DREP_ALWAYS_ABSTAIN) return 'always-abstain';
  if (drepId === DREP_ALWAYS_NO_CONFIDENCE) return 'always-no-confidence';
  return drepId;
};

/**
 * One entry per Cardano account: its delegation target (real bech32 DRep id,
 * 'always-abstain' / 'always-no-confidence', or null when not delegated) and
 * its approximated voting power. Voting power is reported independently of
 * delegation, so an undelegated account with stake still carries its amount.
 * Accounts with no reward details yet map to `{ delegatedTo: null, votingPower: 0 }`.
 */
export const buildCardanoGovernanceAccounts = (
  cardanoAccounts: readonly Pick<AnyAccount, 'accountId'>[],
  rewardAccountDetails: AccountRewardAccountDetailsMap,
): CardanoGovernanceAccount[] =>
  cardanoAccounts.map(({ accountId }) => {
    const info = rewardAccountDetails[accountId]?.rewardAccountInfo;
    return {
      accountId,
      delegatedTo: toDelegatedTo(info?.drepId),
      votingPower: info ? approximateVotingPower(info.controlledAmount) : 0,
    };
  });

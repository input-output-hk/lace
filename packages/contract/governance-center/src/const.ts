import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
  isSentinelDrepId,
} from '@lace-contract/cardano-context';
import { FeatureFlagKey } from '@lace-contract/feature';

import type {
  CardanoPromotedNetworkKey,
  DRepSummary,
  PromotedInformation,
} from '@lace-contract/cardano-context';

// Network-key mapping and localized-copy picker now live in the shared Cardano
// contract (consumed by governance, staking and earn-rewards alike). Re-exported
// here so existing `@lace-contract/governance-center` / `../const` imports are
// unaffected.
export {
  promotedNetworkKeyForChainId,
  pickPromotedInformation,
} from '@lace-contract/cardano-context';
export type { CardanoPromotedNetworkKey } from '@lace-contract/cardano-context';

// The DRep vote-delegation sentinels and classifier live in cardano-context
// (owner of RewardAccountInfo.drepId). Re-exported for existing consumers.
export { DREP_ALWAYS_ABSTAIN, DREP_ALWAYS_NO_CONFIDENCE, isSentinelDrepId };

export const FEATURE_FLAG_GOVERNANCE_CENTER =
  FeatureFlagKey('GOVERNANCE_CENTER');

/**
 * Vote-delegation status of a reward account, derived purely from its `drepId`
 * (as reported by the provider). The UI maps each category to a localized label.
 */
export type DelegationStatus =
  | 'abstaining'
  | 'delegated'
  | 'no-confidence'
  | 'not-delegated';

export const getDelegationStatus = (drepId?: string): DelegationStatus => {
  if (drepId === undefined) return 'not-delegated';
  if (drepId === DREP_ALWAYS_ABSTAIN) return 'abstaining';
  if (drepId === DREP_ALWAYS_NO_CONFIDENCE) return 'no-confidence';
  return 'delegated';
};

/** Localized promotional copy for a promoted DRep. Alias of the shared type. */
export type PromotedDRepInformation = PromotedInformation;

/** A single Lace-promoted DRep entry from the feature-flag payload. */
export type PromotedDRep = {
  id: string;
  additional_information?: PromotedDRepInformation;
};

/** Shape of the optional `GOVERNANCE_CENTER` feature-flag payload. */
export type GovernanceCenterFeatureFlagPayload = {
  promotedDreps?: Partial<Record<CardanoPromotedNetworkKey, PromotedDRep[]>>;
  /**
   * DRep ids Lace blocks from the browse directory: they render in no list
   * order and match no search, EXCEPT when the query is the exact DRep id
   * (either encoding) — deliberate access stays possible, discovery does not,
   * and delegation to a pasted id is unaffected. An explicit, product-owned
   * editorial act (the inverse of `promotedDreps`) — never inferred by the
   * ranking and never hardcoded in source.
   */
  blockedDreps?: Partial<Record<CardanoPromotedNetworkKey, string[]>>;
};

// Remote flag payloads are runtime-editable, so the shape is enforced rather
// than trusted: a non-array network entry would otherwise reach the browse
// sheet and crash its Set construction; here it degrades to "not configured".
const sanitizeBlockedDreps = (
  value: unknown,
): GovernanceCenterFeatureFlagPayload['blockedDreps'] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const perNetwork = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
    .map(([networkKey, ids]): [string, string[]] => [
      networkKey,
      ids.filter((id): id is string => typeof id === 'string'),
    ]);
  return Object.fromEntries(perNetwork);
};

const dropBlockedFromPromoted = (
  promoted: NonNullable<GovernanceCenterFeatureFlagPayload['promotedDreps']>,
  blocked: NonNullable<GovernanceCenterFeatureFlagPayload['blockedDreps']>,
): GovernanceCenterFeatureFlagPayload['promotedDreps'] =>
  Object.fromEntries(
    Object.entries(promoted).map(([networkKey, entries]) => [
      networkKey,
      Array.isArray(entries)
        ? entries.filter(
            entry =>
              !blocked[networkKey as CardanoPromotedNetworkKey]?.includes(
                entry?.id,
              ),
          )
        : entries,
    ]),
  );

/**
 * Defensively extracts the known fields of an untyped feature-flag payload:
 * malformed shapes degrade to "not configured" rather than reaching consumers.
 * A blocked id also beats a promoted one — blocking is the safety control, so
 * a config listing the same DRep in both stops recommending it everywhere this
 * parser feeds (browse sheet promoted section, earn-rewards target).
 */
export const parseGovernanceFeatureFlagPayload = (flag?: {
  payload?: unknown;
}): GovernanceCenterFeatureFlagPayload => {
  const payload = flag?.payload;
  if (!payload || typeof payload !== 'object') return {};
  const { promotedDreps, blockedDreps } =
    payload as GovernanceCenterFeatureFlagPayload;
  const blocked = sanitizeBlockedDreps(blockedDreps);
  const rawPromoted =
    promotedDreps &&
    typeof promotedDreps === 'object' &&
    !Array.isArray(promotedDreps)
      ? promotedDreps
      : undefined;
  const promoted =
    rawPromoted && blocked
      ? dropBlockedFromPromoted(rawPromoted, blocked)
      : rawPromoted;
  return {
    ...(promoted && { promotedDreps: promoted }),
    ...(blocked && { blockedDreps: blocked }),
  };
};

export type DelegationHealth =
  | 'delegated'
  | 'drep-problem'
  | 'not-delegated'
  | 'unknown';

/**
 * Health of an account's vote delegation against the fully-fetched DRep list.
 * `unknown` (list not ready for a specific-DRep delegation) exists so the UI
 * can avoid false problem warnings while the list loads.
 */
export const getDelegationHealth = ({
  drepId,
  dReps,
  listReady,
}: {
  drepId: string | undefined;
  dReps: readonly DRepSummary[];
  listReady: boolean;
}): DelegationHealth => {
  if (drepId === undefined) return 'not-delegated';
  if (isSentinelDrepId(drepId)) return 'delegated';
  if (!listReady) return 'unknown';
  const summary = dReps.find(dRep => dRep.drepId === drepId);
  if (!summary || summary.retired || summary.expired) return 'drep-problem';
  return 'delegated';
};

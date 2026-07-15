import { Cardano } from '@cardano-sdk/core';
import { FeatureFlagKey } from '@lace-contract/feature';

import type { DRepSummary } from '@lace-contract/cardano-context';

export const FEATURE_FLAG_GOVERNANCE_CENTER =
  FeatureFlagKey('GOVERNANCE_CENTER');

/**
 * Blockfrost surfaces the two special vote-delegation targets as these
 * sentinel `drep_id` strings on a reward account, instead of as a real bech32
 * DRep id. They must NOT be resolved via `getDRepInfo` (there is no such DRep)
 * and map to dedicated status labels. If the upstream value ever differs,
 * `getDelegationStatus` falls through to the `'delegated'` branch, which is a
 * safe (if less specific) fallback.
 */
export const DREP_ALWAYS_ABSTAIN = 'drep_always_abstain';
export const DREP_ALWAYS_NO_CONFIDENCE = 'drep_always_no_confidence';

/** True when `drepId` is one of Blockfrost's abstain / no-confidence sentinels. */
export const isSentinelDrepId = (drepId: string): boolean =>
  drepId === DREP_ALWAYS_ABSTAIN || drepId === DREP_ALWAYS_NO_CONFIDENCE;

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

/** Localized promotional copy for a promoted DRep, keyed by language code (e.g. `en`, `es`, `ja`). */
export type PromotedDRepInformation = { [languageCode: string]: string };

/** A single Lace-promoted DRep entry from the feature-flag payload. */
export type PromotedDRep = {
  id: string;
  additional_information?: PromotedDRepInformation;
};

/** Cardano network keys used in the `promotedDreps` payload. */
export type CardanoPromotedNetworkKey =
  | 'mainnet'
  | 'preprod'
  | 'preview'
  | 'sanchonet';

/** Shape of the optional `GOVERNANCE_CENTER` feature-flag payload. */
export type GovernanceCenterFeatureFlagPayload = {
  promotedDreps?: Partial<Record<CardanoPromotedNetworkKey, PromotedDRep[]>>;
};

const NETWORK_MAGIC_TO_PROMOTED_KEY: Record<number, CardanoPromotedNetworkKey> =
  {
    [Number(Cardano.ChainIds.Mainnet.networkMagic)]: 'mainnet',
    [Number(Cardano.ChainIds.Preprod.networkMagic)]: 'preprod',
    [Number(Cardano.ChainIds.Preview.networkMagic)]: 'preview',
    [Number(Cardano.ChainIds.Sanchonet.networkMagic)]: 'sanchonet',
  };

/** Maps an active chain id to its `promotedDreps` payload key (undefined for unknown networks). */
export const promotedNetworkKeyForChainId = (
  chainId: Cardano.ChainId,
): CardanoPromotedNetworkKey | undefined =>
  NETWORK_MAGIC_TO_PROMOTED_KEY[Number(chainId.networkMagic)];

/** Defensively extracts the `promotedDreps` payload from an untyped feature flag. */
export const parseGovernanceFeatureFlagPayload = (flag?: {
  payload?: unknown;
}): GovernanceCenterFeatureFlagPayload => {
  const payload = flag?.payload;
  if (!payload || typeof payload !== 'object') return {};
  const { promotedDreps } = payload as GovernanceCenterFeatureFlagPayload;
  if (!promotedDreps || typeof promotedDreps !== 'object') return {};
  return { promotedDreps };
};

/** English is the guaranteed-present fallback language for promotional copy. */
const PROMOTED_INFORMATION_FALLBACK_LANGUAGE = 'en';

/** Picks the promotional copy for the given language: exact → 2-letter prefix → English → first available. */
export const pickPromotedInformation = (
  information: PromotedDRepInformation | undefined,
  language: string,
): string | undefined => {
  if (!information) return undefined;
  return (
    information[language] ??
    information[language.split('-')[0]] ??
    information[PROMOTED_INFORMATION_FALLBACK_LANGUAGE] ??
    Object.values(information)[0]
  );
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

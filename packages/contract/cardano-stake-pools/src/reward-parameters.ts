import type { StakePoolsNetworkData } from './types';

type Parameter = keyof StakePoolsNetworkData;

/**
 * The network figures the reward pot and a pool's share of it are built from.
 * The ranking needs exactly these: it scores pools against each other and never
 * annualises, so nothing about epoch length or block timing enters it.
 */
const REWARD_POT_PARAMETERS = [
  'desiredNumberOfPools',
  'maxLovelaceSupply',
  'monetaryExpansion',
  'poolInfluence',
  'reserves',
  'treasuryCut',
] as const satisfies readonly Parameter[];

/**
 * Everything the annualised rate additionally divides or multiplies by: the
 * delegated total (block production is proportional to a share of what is
 * actually staked, not of circulating supply) and the epoch's shape.
 */
const RATE_PARAMETERS = [
  ...REWARD_POT_PARAMETERS,
  'activeSlotsCoefficient',
  'epochLength',
  'liveStake',
  'slotLength',
] as const satisfies readonly Parameter[];

/**
 * The type declaring these present is not enough to trust them: this state is
 * PERSISTED, so a payload written by an earlier version can lack a field added
 * since — `treasuryCut` was — and `Number(undefined)` is `NaN`, which no
 * arithmetic rejects. It reaches every pool at once and surfaces as `~NaN%` on
 * a card, or as a ranking whose comparator can no longer order anything.
 *
 * `false` means "not yet loaded, or written by an older version": callers
 * return no figure rather than a derived one, because a wrong number in front
 * of a delegator is worse than an absent one.
 */
const allFinite = (
  networkData: StakePoolsNetworkData,
  parameters: readonly Parameter[],
): boolean =>
  parameters.every(key => Number.isFinite(Number(networkData[key])));

export const hasRewardPotParameters = (
  networkData: StakePoolsNetworkData,
): boolean => allFinite(networkData, REWARD_POT_PARAMETERS);

export const hasRateParameters = (
  networkData: StakePoolsNetworkData,
): boolean => allFinite(networkData, RATE_PARAMETERS);

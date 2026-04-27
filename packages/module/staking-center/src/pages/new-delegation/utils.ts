import {
  convertLovelacesToAda,
  LOVELACE_VALUE,
} from '@lace-contract/cardano-context';
import { toPercentage } from '@lace-contract/cardano-stake-pools';
import { compactNumberWithUnit, UnitThreshold } from '@lace-lib/util-render';

import type { LaceStakePool } from '@lace-contract/cardano-stake-pools';

export const getPoolDisplayData = (pool: LaceStakePool, adaPrice: number) => {
  const poolName = pool.poolName ?? '';
  const poolTicker = pool.ticker ?? '';
  const multiplier = adaPrice / LOVELACE_VALUE;
  const declaredPledge = pool.declaredPledge;
  const fixedCost = pool.cost;
  const activeStake = pool.activeStake;
  const liveStake = pool.liveStake;

  return {
    poolName,
    poolTicker,
    poolAvatarFallback:
      poolTicker.slice(0, 2) || poolName.slice(0, 2).toUpperCase() || '??',
    saturationPercentage: pool.liveSaturation,
    marginPercentage: toPercentage(pool.margin),
    pledgeAda: compactNumberWithUnit(
      convertLovelacesToAda(declaredPledge),
      2,
      UnitThreshold.THOUSAND,
    ),
    pledgeExchange: compactNumberWithUnit(
      (Number(declaredPledge) * multiplier).toString(),
      2,
      UnitThreshold.THOUSAND,
    ),
    costAda: compactNumberWithUnit(
      convertLovelacesToAda(fixedCost),
      2,
      UnitThreshold.THOUSAND,
    ),
    costExchange: compactNumberWithUnit(
      (Number(fixedCost) * multiplier).toString(),
      2,
      UnitThreshold.THOUSAND,
    ),
    activeStakeAda: compactNumberWithUnit(
      convertLovelacesToAda(activeStake),
      2,
      UnitThreshold.THOUSAND,
    ),
    activeStakeExchange: compactNumberWithUnit(
      (Number(activeStake) * multiplier).toString(),
      2,
      UnitThreshold.THOUSAND,
    ),
    liveStakeAda: compactNumberWithUnit(
      convertLovelacesToAda(liveStake),
      2,
      UnitThreshold.THOUSAND,
    ),
    blocks: compactNumberWithUnit(pool.blocks.toString(), 0),
    delegators: compactNumberWithUnit(pool.liveDelegators.toString(), 0),
    rosPercentage: toPercentage(pool.ros ?? 0),
  };
};

export const formatFeeDisplay = (
  feeLovelace: number,
  depositLovelace: number,
  nativeTicker: string,
): { feeAda: string; depositAda: string | undefined; totalAda: string } => {
  const feeAda = feeLovelace / LOVELACE_VALUE;
  const depositAda = depositLovelace / LOVELACE_VALUE;
  const totalAda = feeAda + depositAda;

  return {
    feeAda: `${feeAda.toFixed(6)} ${nativeTicker}`,
    depositAda:
      depositAda > 0 ? `${depositAda.toFixed(6)} ${nativeTicker}` : undefined,
    totalAda: `${totalAda.toFixed(6)} ${nativeTicker}`,
  };
};

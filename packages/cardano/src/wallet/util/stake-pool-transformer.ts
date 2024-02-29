import { formatPercentages, getRandomIcon, getNumberWithUnit } from '@lace/common';
import { Cardano } from '@cardano-sdk/core';
import { CoinId } from '@src/wallet';
import { lovelacesToAdaString } from './unit-converters';

export interface StakePool {
  id: string;
  hexId: Cardano.PoolIdHex;
  pledge: { number: string; unit?: string };
  margin: string;
  owners: string[];
  name?: string;
  description?: string;
  ticker?: string;
  logo?: string;
  retired?: boolean;
  ros?: string;
  liveStake: { number: string; unit?: string };
  cost: { number: string; unit?: string };
  saturation?: string;
  blocks?: string;
  isStakingPool?: boolean;
  stakePool: Cardano.StakePool;
}

type StakePoolTransformerProp = {
  stakePool: Cardano.StakePool;
  delegatingPoolId?: string;
  cardanoCoin?: CoinId;
};

export const stakePoolTransformer = ({ stakePool, delegatingPoolId }: StakePoolTransformerProp): StakePool => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;

  return {
    id: id.toString(),
    hexId,
    name: metadata?.name,
    ticker: metadata?.ticker,
    logo: metadata?.ext?.pool.media_assets?.icon_png_64x64 || getRandomIcon({ id: id.toString(), size: 30 }),
    owners: owners ? owners.map((owner: Cardano.RewardAccount) => owner.toString()) : [],
    retired: status === Cardano.StakePoolStatus.Retired,
    description: metadata?.description,
    ...(margin && { margin: `${formatPercentages(margin.numerator / margin.denominator)}` }),
    cost: cost ? getNumberWithUnit(lovelacesToAdaString(cost.toString())) : { number: '-', unit: '' },
    liveStake: metrics?.stake.live
      ? getNumberWithUnit(lovelacesToAdaString(metrics?.stake.live.toString()))
      : { number: '-', unit: '' },
    ...(metrics && {
      ...(metrics.ros && { ros: formatPercentages(metrics.ros.valueOf()) }),
      saturation: formatPercentages(metrics.saturation.valueOf()),
      blocks: metrics?.blocksCreated?.toString()
    }),
    pledge: pledge ? getNumberWithUnit(lovelacesToAdaString(pledge.toString())) : { number: '-', unit: '' },
    ...(delegatingPoolId && { isStakingPool: delegatingPoolId === id.toString() }),
    stakePool
  };
};

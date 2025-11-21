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
  liveStake?: { number: string; unit?: string };
  cost: { number: string; unit?: string };
  fee: string;
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
    margin: formatPercentages(margin.numerator / margin.denominator),
    fee: lovelacesToAdaString(cost.toString()),
    cost: getNumberWithUnit(lovelacesToAdaString(cost.toString())),
    ...(metrics && {
      liveStake: getNumberWithUnit(lovelacesToAdaString(metrics.stake.live.toString())),
      ros: formatPercentages(metrics.ros.valueOf()),
      saturation: formatPercentages(metrics.saturation.valueOf()),
      blocks: metrics?.blocksCreated?.toString()
    }),
    pledge: getNumberWithUnit(lovelacesToAdaString(pledge.toString())),
    ...(delegatingPoolId && { isStakingPool: delegatingPoolId === id.toString() }),
    stakePool
  };
};

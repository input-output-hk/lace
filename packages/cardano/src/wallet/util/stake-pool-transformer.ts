/* eslint-disable no-console */
import { Required } from 'utility-types';
import { formatPercentages, getRandomIcon, getNumberWithUnit } from '@lace/common';
import { Cardano } from '@cardano-sdk/core';
import { CoinId } from '@src/wallet';
import { lovelacesToAdaString } from './unit-converters';

export interface StakePool {
  id: string;
  hexId: string;
  pledge: string;
  margin: string;
  cost: string;
  owners: string[];
  name?: string;
  description?: string;
  ticker?: string;
  logo?: string;
  retired?: boolean;
  apy?: string;
  liveStake?: { number: string; unit?: string };
  blocks: string;
  saturation?: string;
  fee?: number | string;
  isStakingPool?: boolean;
}

type StakePoolTransformerProp = {
  stakePool: Required<Cardano.StakePool, 'metrics'>;
  delegatingPoolId?: string;
  cardanoCoin?: CoinId;
};

export const stakePoolTransformer = ({ stakePool, delegatingPoolId }: StakePoolTransformerProp): StakePool => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;
  const formattedPledge = getNumberWithUnit(lovelacesToAdaString(pledge.toString()));
  const formattedCost = cost && getNumberWithUnit(lovelacesToAdaString(cost.toString()));

  return {
    id: id.toString(),
    hexId: hexId.toString(),
    name: metadata?.name,
    ticker: metadata?.ticker,
    logo: metadata?.ext?.pool.media_assets?.icon_png_64x64 || getRandomIcon({ id: id.toString(), size: 30 }),
    owners: owners ? owners.map((owner: Cardano.RewardAccount) => owner.toString()) : [],
    retired: status === Cardano.StakePoolStatus.Retired,
    fee: lovelacesToAdaString(cost.toString()),
    description: metadata?.description,
    ...(margin && { margin: `${formatPercentages(margin.numerator / margin.denominator)}` }),
    cost: `${formattedCost.number}${formattedCost.unit}`,
    liveStake: getNumberWithUnit(lovelacesToAdaString(metrics.stake.live.toString())),
    ...(metrics.apy && { apy: formatPercentages(metrics.apy.valueOf()) }),
    saturation: formatPercentages(metrics.saturation.valueOf()),
    blocks: metrics.blocksCreated.toString(),
    pledge: `${formattedPledge.number}${formattedPledge.unit}`,
    ...(delegatingPoolId && { isStakingPool: delegatingPoolId === id.toString() })
  };
};

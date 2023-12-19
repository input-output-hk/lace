/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
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
  size: string;
  saturation?: string;
  fee?: number | string;
  isStakingPool?: boolean;
}

type StakePoolTransformerProp = {
  stakePool: Cardano.StakePool;
  delegatingPoolId?: string;
  cardanoCoin: CoinId;
};

export const stakePoolTransformer = ({
  stakePool,
  delegatingPoolId,
  cardanoCoin
}: StakePoolTransformerProp): StakePool => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;
  const formattedPledge = pledge && getNumberWithUnit(lovelacesToAdaString(pledge.toString()));
  const formattedCost = cost && getNumberWithUnit(lovelacesToAdaString(cost.toString()));
  const formattedBlock = getNumberWithUnit(metrics?.blocksCreated?.toString());

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
    ...(cost && {
      cost: `${formattedCost.number}${formattedCost.unit}${cardanoCoin.symbol}`
    }),
    ...(metrics && {
      ...(metrics.apy && { apy: formatPercentages(metrics.apy.valueOf()) }),
      saturation: formatPercentages(metrics.saturation.valueOf()),
      blocks: `${formattedBlock?.number}${formattedBlock?.unit}`,
      size: formatPercentages(metrics.size.live)
    }),
    ...(pledge && {
      pledge: `${formattedPledge.number}${formattedPledge.unit} ${cardanoCoin.symbol}`
    }),
    ...(delegatingPoolId && { isStakingPool: delegatingPoolId === id.toString() })
  };
};

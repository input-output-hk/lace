import { formatPercentages, getRandomIcon } from '@lace/common';
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
  liveStake?: string;
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
      cost: `${cardanoCoin.symbol} ${lovelacesToAdaString(cost.toString())}`
    }),
    ...(metrics && {
      ...(metrics.apy && { apy: formatPercentages(metrics.apy.valueOf()) }),
      saturation: formatPercentages(metrics.saturation.valueOf()),
      blocks: metrics?.blocksCreated?.toString(),
      liveStake: formatPercentages(metrics.size.live)
    }),
    ...(pledge && {
      pledge: `${cardanoCoin.symbol} ${lovelacesToAdaString(pledge.toString())}`
    }),
    ...(delegatingPoolId && { isStakingPool: delegatingPoolId === id.toString() })
  };
};

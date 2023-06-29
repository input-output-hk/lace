/* eslint-disable no-magic-numbers */
import { formatPercentages, getRandomIcon } from '@lace/common';
import * as Wallet from '@wallet';

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
  apy?: number | string;
  size?: string;
  saturation?: number | string;
  fee?: number | string;
  isStakingPool?: boolean;
}

type StakePoolTransformerProp = {
  stakePool: Wallet.Cardano.StakePool;
  delegatingPoolId?: string;
  cardanoCoin: Wallet.CoinId;
};

export const stakePoolTransformer = ({
  stakePool,
  delegatingPoolId,
  cardanoCoin
}: StakePoolTransformerProp): StakePool => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;
  const { size, apy, saturation } = metrics;
  const calcCost = cost ? ` + ${Wallet.util.lovelacesToAdaString(cost.toString(), 0)}${cardanoCoin.symbol}` : '';
  const calcMargin = margin ? `${formatPercentages(margin.numerator / margin.denominator)}` : '-';

  return {
    hexId: hexId.toString(),
    margin: calcMargin,
    pledge: pledge ? `${Wallet.util.lovelacesToAdaString(pledge.toString())}${cardanoCoin.symbol}` : '-',
    owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
    retired: status === Wallet.Cardano.StakePoolStatus.Retired,
    description: metadata?.description,
    size: `${size?.live ?? '-'} %`,
    id: id.toString(),
    cost: `${calcMargin}%${calcCost}`,
    name: metadata?.name,
    ticker: metadata?.ticker,
    logo: metadata?.ext?.pool.media_assets?.icon_png_64x64 || getRandomIcon({ id: id.toString(), size: 30 }),
    apy: apy && formatPercentages(apy.valueOf()),
    saturation: saturation && formatPercentages(saturation.valueOf()),
    fee: Wallet.util.lovelacesToAdaString(cost.toString()),
    isStakingPool: delegatingPoolId ? delegatingPoolId === id.toString() : undefined
  };
};

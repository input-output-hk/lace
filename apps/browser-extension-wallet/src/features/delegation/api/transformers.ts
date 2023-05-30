/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { StakePool } from '../types';
import { getRandomIcon } from '@src/utils/get-random-icon';
import { formatPercentages } from '@src/utils/format-number';
import { CoinId } from '@src/types';

type StakePoolTransformerProp = {
  stakePool: Wallet.Cardano.StakePool;
  delegatingPoolId?: string;
  cardanoCoin: CoinId;
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

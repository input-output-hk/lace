import { Wallet } from '@lace/cardano';
import { formatPercentages, getNumberWithUnit, getRandomIcon } from '@lace/common';
import { AdaSymbol } from './types';

// TODO: try to remove data existense checks. in most cases that data is present according to StakePool type
// eslint-disable-next-line complexity
export const mapStakePoolToDisplayData = ({
  cardanoCoinSymbol,
  stakePool,
}: {
  cardanoCoinSymbol: AdaSymbol;
  stakePool: Wallet.Cardano.StakePool;
}) => {
  const margin = formatPercentages(stakePool.margin.numerator / stakePool.margin.denominator);
  const fee = Wallet.util.lovelacesToAdaString(stakePool.cost.toString());

  return {
    apy: stakePool.metrics?.apy && formatPercentages(stakePool.metrics.apy),
    blocks: stakePool.metrics?.blocksCreated || '-',
    contact: {
      primary: stakePool.metadata?.homepage,
      ...stakePool.metadata?.ext?.pool.contact,
    },
    cost: `${margin || '-'}% + ${fee}${cardanoCoinSymbol}`,
    costsPerEpoch: 'costsPerEpoch',
    delegators: stakePool.metrics?.delegators || '-',
    description: stakePool.metadata?.description || '-',
    fee,
    hexId: stakePool.hexId.toString(),
    id: stakePool.id.toString(),
    logo:
      stakePool.metadata?.ext?.pool.media_assets?.icon_png_64x64 ||
      getRandomIcon({ id: stakePool.id.toString(), size: 30 }),
    margin,
    name: stakePool.metadata?.name || '-',
    owners: stakePool.owners ? stakePool.owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
    pledge: Wallet.util.lovelacesToAdaString(stakePool.pledge.toString()),
    retired: stakePool.status === Wallet.Cardano.StakePoolStatus.Retired,
    saturation: stakePool.metrics?.saturation && formatPercentages(stakePool.metrics.saturation),
    size: `${stakePool.metrics?.size.live ?? '-'} %`,
    stake: stakePool.metrics?.stake.active
      ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(stakePool.metrics?.stake.active.toString()))
      : { number: '-' },
    status: stakePool.status,
    ticker: stakePool.metadata?.ticker || '-',
  };
};

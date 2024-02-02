import { Wallet } from '@lace/cardano';
import { formatPercentages, getNumberWithUnit, getRandomIcon } from '@lace/common';
import BigNumber from 'bignumber.js';

// TODO: try to remove data existense checks. in most cases that data is present according to StakePool type
// eslint-disable-next-line complexity
export const mapStakePoolToDisplayData = ({ stakePool }: { stakePool: Wallet.Cardano.StakePool }) => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;

  return {
    activeStake: metrics?.stake.active
      ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics?.stake.active.toString()))
      : { number: '-', unit: '' },
    contact: {
      primary: metadata?.homepage,
      ...metadata?.ext?.pool.contact,
    },
    cost: cost ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(cost.toString())) : { number: '-', unit: '' },
    delegators: metrics?.delegators || '-',
    description: metadata?.description || '-',
    hexId,
    id: id.toString(),
    liveStake: metrics?.stake.live
      ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics?.stake.live.toString()))
      : { number: '-', unit: '' },
    logo: metadata?.ext?.pool.media_assets?.icon_png_64x64 || getRandomIcon({ id: id.toString(), size: 30 }),
    margin: `${formatPercentages(margin.numerator / margin.denominator)}`,
    name: metadata?.name || '-',
    owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
    pledge: pledge ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(pledge.toString())) : { number: '-', unit: '' },
    retired: status === Wallet.Cardano.StakePoolStatus.Retired,
    status,
    ticker: metadata?.ticker || '-',
    ...(metrics && {
      ...(metrics.apy && { apy: formatPercentages(metrics.apy.valueOf()) }),
      blocks: new BigNumber(metrics.blocksCreated).toFormat(),
      delegators: new BigNumber(metrics.delegators).toFormat(),
      saturation: formatPercentages(metrics.saturation),
    }),
    stakePool,
  };
};

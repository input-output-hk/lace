import { Wallet } from '@lace/cardano';
import { formatPercentages, getNumberWithUnit, getRandomIcon } from '@lace/common';
import BigNumber from 'bignumber.js';
import { StakePoolDetails } from './types';

// TODO: try to remove data existense checks. in most cases that data is present according to StakePool type
// eslint-disable-next-line complexity
export const mapStakePoolToDisplayData = ({ stakePool }: { stakePool: Wallet.Cardano.StakePool }): StakePoolDetails => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;

  // TODO do not use '-' as a fallback value; https://input-output.atlassian.net/browse/LW-10001
  return {
    activeStake: metrics
      ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics.stake.active.toString()))
      : { number: '-', unit: '' },
    blocks: metrics ? new BigNumber(metrics.blocksCreated).toFormat() : '-',
    contact: {
      primary: metadata?.homepage,
      ...metadata?.ext?.pool.contact,
    },
    cost: getNumberWithUnit(Wallet.util.lovelacesToAdaString(cost.toString())),
    delegators: metrics ? new BigNumber(metrics.delegators).toFormat() : '-',
    description: metadata?.description || '-',
    hexId,
    id: id.toString(),
    liveStake: metrics
      ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics.stake.live.toString()))
      : { number: '-', unit: '' },
    logo: metadata?.ext?.pool.media_assets?.icon_png_64x64 || getRandomIcon({ id: id.toString(), size: 30 }),
    margin: formatPercentages(margin.numerator / margin.denominator),
    name: metadata?.name || '-',
    owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
    pledge: getNumberWithUnit(Wallet.util.lovelacesToAdaString(pledge.toString())),
    retired: status === Wallet.Cardano.StakePoolStatus.Retired,
    ros: metrics ? formatPercentages(metrics.ros.valueOf()) : '-',
    saturation: metrics ? formatPercentages(metrics.saturation) : '-',
    stakePool,
    status,
    ticker: metadata?.ticker || '-',
  };
};

import { Wallet } from '@lace/cardano';
import { formatPercentages, getNumberWithUnit, getRandomIcon } from '@lace/common';
import BigNumber from 'bignumber.js';
import { StakePoolDetails } from './types';

// eslint-disable-next-line complexity
export const mapStakePoolToDisplayData = ({ stakePool }: { stakePool: Wallet.Cardano.StakePool }): StakePoolDetails => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;

  return {
    ...(metrics && {
      activeStake: getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics.stake.active.toString())),
      blocks: new BigNumber(metrics.blocksCreated).toFormat(),
      delegators: new BigNumber(metrics.delegators).toFormat(),
      liveStake: getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics.stake.live.toString())),
      ros: formatPercentages(metrics.ros.valueOf()),
      saturation: formatPercentages(metrics.saturation),
    }),
    contact: {
      primary: metadata?.homepage,
      ...metadata?.ext?.pool.contact,
    },
    cost: getNumberWithUnit(Wallet.util.lovelacesToAdaString(cost.toString())),
    description: metadata?.description,
    hexId,
    id: id.toString(),
    logo: metadata?.ext?.pool.media_assets?.icon_png_64x64 || getRandomIcon({ id: id.toString(), size: 30 }),
    margin: formatPercentages(margin.numerator / margin.denominator),
    name: metadata?.name,
    owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
    pledge: getNumberWithUnit(Wallet.util.lovelacesToAdaString(pledge.toString())),
    retired: status === Wallet.Cardano.StakePoolStatus.Retired,
    stakePool,
    status,
    ticker: metadata?.ticker,
  };
};

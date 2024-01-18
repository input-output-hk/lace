import { Wallet } from '@lace/cardano';
import { formatPercentages, getNumberWithUnit, getRandomIcon } from '@lace/common';
import BigNumber from 'bignumber.js';
import { Required } from 'utility-types';

// TODO: try to remove data existense checks. in most cases that data is present according to StakePool type
// eslint-disable-next-line complexity
export const mapStakePoolToDisplayData = ({
  stakePool,
}: {
  stakePool: Required<Wallet.Cardano.StakePool, 'metrics'>;
}) => {
  const { margin, cost, hexId, pledge, owners, status, metadata, id, metrics } = stakePool;
  const fee = Wallet.util.lovelacesToAdaString(cost.toString());
  const formattedCost = getNumberWithUnit(Wallet.util.lovelacesToAdaString(cost.toString()));
  const formattedPledge = getNumberWithUnit(Wallet.util.lovelacesToAdaString(pledge.toString()));

  return {
    contact: {
      primary: metadata?.homepage,
      ...metadata?.ext?.pool.contact,
    },
    cost: `${formattedCost.number}${formattedCost.unit}`,
    description: metadata?.description || '-',
    fee,
    hexId: hexId.toString(),
    id: id.toString(),
    logo: metadata?.ext?.pool.media_assets?.icon_png_64x64 || getRandomIcon({ id: id.toString(), size: 30 }),
    ...(margin && { margin: `${formatPercentages(margin.numerator / margin.denominator)}` }),
    activeStake: getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics.stake.active.toString())),
    apy: metrics.apy ? formatPercentages(metrics.apy.valueOf()) : '-',
    blocks: new BigNumber(metrics.blocksCreated).toFormat(),
    delegators: new BigNumber(metrics.delegators).toFormat(),
    liveStake: getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics.stake.live.toString())),
    name: metadata?.name || '-',
    owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
    pledge: `${formattedPledge.number}${formattedPledge.unit}`,
    retired: status === Wallet.Cardano.StakePoolStatus.Retired,
    saturation: formatPercentages(metrics.saturation),
    status,
    ticker: metadata?.ticker || '-',
  };
};

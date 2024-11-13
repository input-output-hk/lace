import { PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, PieChartGradientColor } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import type { CurrentPortfolioStakePool } from '../../store';
import { isOverSaturated } from './hasSaturatedOrRetiredPools';

type MapPortfolioToDisplayDataParams = {
  cardanoCoin: Wallet.CoinId;
  cardanoPrice?: number;
  portfolio: CurrentPortfolioStakePool[];
  poolIdToRewardAccountMap: Map<string | undefined, Wallet.Cardano.RewardAccountInfo>;
};

export const mapPortfolioToDisplayData = ({
  poolIdToRewardAccountMap,
  cardanoCoin,
  cardanoPrice,
  portfolio,
}: MapPortfolioToDisplayDataParams) => {
  const displayData = portfolio.map((item, index) => ({
    ...item,
    ...item.displayData,
    cardanoCoin,
    color: PIE_CHART_DEFAULT_COLOR_SET[index] as PieChartColor,
    fee: Wallet.util.lovelacesToAdaString(item.displayData.stakePool.cost.toString()),
    fiat: cardanoPrice,
    lastReward: Wallet.util.lovelacesToAdaString(item.displayData.lastReward.toString()),
    name: item.displayData.name,
    stakeKey: poolIdToRewardAccountMap.get(item.displayData.id)?.address,
    status: ((): 'retired' | 'saturated' | 'retiring' | undefined => {
      if (item.stakePool.status === 'retired') return 'retired';
      if (item.stakePool.status === 'retiring') return 'retiring';
      if (isOverSaturated(item.displayData.saturation || 0)) return 'saturated';
      // eslint-disable-next-line consistent-return, unicorn/no-useless-undefined
      return undefined;
    })(),
    totalRewards: Wallet.util.lovelacesToAdaString(item.displayData.totalRewards.toString()),
    totalStaked: Wallet.util.lovelacesToAdaString(item.value.toString()),
  }));

  if (displayData.length === 1) {
    displayData.forEach((item) => (item.color = PieChartGradientColor.LaceLinearGradient));
  }

  return displayData;
};

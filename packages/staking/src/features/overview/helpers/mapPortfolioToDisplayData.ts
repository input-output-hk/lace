import { Wallet } from '@lace/cardano';
import { PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, PieChartGradientColor } from '@lace/ui';
import { CurrentPortfolioStakePool } from '../../store';

const SATURATION_UPPER_BOUND = 100;

type MapPortfolioToDisplayDataParams = {
  cardanoCoin: Wallet.CoinId;
  cardanoPrice?: number;
  portfolio: CurrentPortfolioStakePool[];
};

export const mapPortfolioToDisplayData = ({
  cardanoCoin,
  cardanoPrice,
  portfolio,
}: MapPortfolioToDisplayDataParams) => {
  const displayData = portfolio.map((item, index) => ({
    ...item,
    ...item.displayData,
    cardanoCoin,
    color: PIE_CHART_DEFAULT_COLOR_SET[index] as PieChartColor,
    fiat: cardanoPrice,
    lastReward: Wallet.util.lovelacesToAdaString(item.displayData.lastReward.toString()),
    name: item.displayData.name || '-',
    status: ((): 'retired' | 'saturated' | undefined => {
      if (item.displayData.retired) return 'retired';
      if (Number(item.displayData.saturation || 0) > SATURATION_UPPER_BOUND) return 'saturated';
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

import { Wallet } from '@lace/cardano';
import { PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, PieChartGradientColor } from '@lace/ui';
import flatMap from 'lodash/flatMap';
import type { StakingRewards } from '../outside-handles-provider';
import type { AssetActivityListProps, TransactionType } from '@lace/core';
import { CurrentPortfolioStakePool } from '../store';

const SATURATION_UPPER_BOUND = 100;

type MapPortfolioToDisplayDataParams = {
  cardanoCoin: Wallet.CoinId;
  cardanoPrice?: number;
  portfolio: CurrentPortfolioStakePool[];
  stakingRewards: StakingRewards;
};

export const mapPortfolioToDisplayData = ({
  cardanoCoin,
  cardanoPrice,
  portfolio,
  stakingRewards,
}: MapPortfolioToDisplayDataParams) => {
  const displayData = portfolio.map((item, index) => ({
    ...item,
    ...item.displayData,
    cardanoCoin,
    color: PIE_CHART_DEFAULT_COLOR_SET[index] as PieChartColor,
    fiat: cardanoPrice,
    lastReward: Wallet.util.lovelacesToAdaString(stakingRewards.lastReward.toString()),
    status: ((): 'retired' | 'saturated' | undefined => {
      if (item.displayData.retired) return 'retired';
      if (Number(item.displayData.saturation || 0) > SATURATION_UPPER_BOUND) return 'saturated';
      // eslint-disable-next-line consistent-return, unicorn/no-useless-undefined
      return undefined;
    })(),
    totalRewards: Wallet.util.lovelacesToAdaString(stakingRewards.totalRewards.toString()),
    totalStaked: Wallet.util.lovelacesToAdaString(item.value.toString()),
  }));

  if (displayData.length === 1) {
    displayData.forEach((item) => (item.color = PieChartGradientColor.LaceLinearGradient));
  }

  return displayData;
};

const DelegationTransactionTypes: Set<TransactionType> = new Set([
  'delegation',
  'delegationRegistration',
  'delegationDeregistration',
]);

export const hasPendingDelegationTransaction = (walletActivities: AssetActivityListProps[]) =>
  flatMap(walletActivities, ({ items }) => items).some(
    ({ type, status }) => type && DelegationTransactionTypes.has(type) && status === 'sending'
  );

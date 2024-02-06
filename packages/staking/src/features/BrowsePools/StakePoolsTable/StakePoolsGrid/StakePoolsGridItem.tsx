import { PostHogAction } from '@lace/common';
import { StakePoolCard } from 'features/BrowsePools/StakePoolCard';
import { MetricType, SortField } from 'features/BrowsePools/types';
import get from 'lodash/get';
import React from 'react';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { MAX_POOLS_COUNT, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../../store';
import { StakePoolsGridItemProps } from './types';

export const StakePoolsGridItem = ({
  stakePool,
  hexId,
  id,
  saturation,
  ticker,
  sortField,
  ...data
}: StakePoolsGridItemProps): React.ReactElement => {
  const { analytics } = useOutsideHandles();

  const { portfolioMutators, poolAlreadySelected } = useDelegationPortfolioStore((store) => ({
    poolAlreadySelected: isPoolSelectedSelector(hexId)(store),
    portfolioMutators: store.mutators,
    selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
  }));

  const onClick = () => {
    portfolioMutators.executeCommand({ data: stakePool, type: 'ShowPoolDetailsFromList' });
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailClick);
  };

  const metricType = sortField === SortField.name ? MetricType.ticker : MetricType[sortField];

  return (
    <StakePoolCard
      key={id}
      metricType={metricType}
      metricValue={get(data, metricType)}
      saturation={saturation}
      title={ticker}
      onClick={onClick}
      selected={poolAlreadySelected}
    />
  );
};

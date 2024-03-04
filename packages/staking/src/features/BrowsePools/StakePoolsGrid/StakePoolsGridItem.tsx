import { PostHogAction } from '@lace/common';
import { StakePoolCard } from 'features/BrowsePools/StakePoolCard';
import React from 'react';
import { useOutsideHandles } from '../../outside-handles-provider';
import { MAX_POOLS_COUNT, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../store';
import { StakePoolsGridItemProps } from './types';

export const StakePoolsGridItem = ({
  stakePool,
  hexId,
  id,
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

  return (
    <StakePoolCard
      key={id}
      metricType={sortField}
      metricValue={data[sortField]}
      saturation={data.saturation}
      title={data.ticker}
      onClick={onClick}
      selected={poolAlreadySelected}
    />
  );
};

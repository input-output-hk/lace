import { PostHogAction } from '@lace/common';
import { StakePoolCard } from 'features/BrowsePools/StakePoolCard';
import React from 'react';
import { useOutsideHandles } from '../../outside-handles-provider';
import { MAX_POOLS_COUNT, StakePoolDetails, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../store';
import { DEFAULT_SORT_OPTIONS } from '../constants';
import { getFormattedStakePoolProp } from '../formatters';
import { useQueryStakePools } from '../hooks';
import { SortField } from '../types';

type StakePoolsGridItemProps = StakePoolDetails & {
  sortField?: SortField;
};

export const StakePoolsGridItem = ({ stakePool, hexId, id, ...data }: StakePoolsGridItemProps): React.ReactElement => {
  const { analytics } = useOutsideHandles();
  const { sort } = useQueryStakePools();

  const sortField = sort?.field || DEFAULT_SORT_OPTIONS.field;

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
      metricValue={getFormattedStakePoolProp(data, sortField)}
      saturation={data.saturation}
      title={data.ticker}
      onClick={onClick}
      selected={poolAlreadySelected}
    />
  );
};

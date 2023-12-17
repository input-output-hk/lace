import { PostHogAction } from '@lace/common';
import React from 'react';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { MAX_POOLS_COUNT, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../../store';
import {
  StakePoolItemBrowser as StakePoolItemBrowserComponnet,
  StakePoolItemBrowserProps,
} from './StakePoolItemBrowser';
export type { StakePoolItemBrowserProps } from './StakePoolItemBrowser';

export const StakePoolItemBrowser = ({ ...data }: StakePoolItemBrowserProps): React.ReactElement => {
  const { analytics } = useOutsideHandles();
  const { hexId, stakePool } = data;

  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    poolAlreadySelected: isPoolSelectedSelector(hexId)(store),
    portfolioMutators: store.mutators,
    selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
    selectionsNotEmpty: store.selectedPortfolio.length > 0,
  }));

  const onClick = () => {
    portfolioMutators.executeCommand({ data: stakePool, type: 'ShowPoolDetailsFromList' });
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailClick);
  };

  return <StakePoolItemBrowserComponnet multiDelegationEnabled {...data} onClick={onClick} />;
};

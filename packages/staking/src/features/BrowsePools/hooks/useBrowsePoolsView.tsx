import { PostHogAction } from '@lace/common';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from 'features/store';
import { useCallback, useMemo } from 'react';
import { DEFAULT_BROWSE_POOLS_VIEW } from '../constants';
import { BrowsePoolsView } from '../types';

const PostHogActionsMap: Record<BrowsePoolsView, PostHogAction> = {
  [BrowsePoolsView.grid]: PostHogAction.StakingBrowsePoolsToggleGridViewClick,
  [BrowsePoolsView.table]: PostHogAction.StakingBrowsePoolsToggleListViewClick,
};

export const useBrowsePoolsView = () => {
  const { analytics } = useOutsideHandles();
  const { poolsView, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    poolsView: store.browsePoolsView || DEFAULT_BROWSE_POOLS_VIEW,
    portfolioMutators: store.mutators,
  }));

  const switchPoolsView = useCallback(() => {
    const newView = poolsView === BrowsePoolsView.table ? BrowsePoolsView.grid : BrowsePoolsView.table;
    analytics.sendEventToPostHog(PostHogActionsMap[newView]);

    portfolioMutators.executeCommand({
      data: newView,
      type: 'SetBrowsePoolsView',
    });
  }, [analytics, poolsView, portfolioMutators]);

  return useMemo(
    () => ({
      poolsView,
      switchPoolsView,
    }),
    [poolsView, switchPoolsView]
  );
};

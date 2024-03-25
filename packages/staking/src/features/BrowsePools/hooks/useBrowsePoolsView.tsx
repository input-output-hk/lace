import { useDelegationPortfolioStore } from 'features/store';
import { useCallback, useMemo } from 'react';
import { DEFAULT_BROWSE_POOLS_VIEW } from '../constants';
import { BrowsePoolsView } from '../types';

export const useBrowsePoolsView = () => {
  const { poolsView, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    poolsView: store.browsePoolsView || DEFAULT_BROWSE_POOLS_VIEW,
    portfolioMutators: store.mutators,
  }));

  const switchPoolsView = useCallback(() => {
    const newView = poolsView === BrowsePoolsView.table ? BrowsePoolsView.grid : BrowsePoolsView.table;
    portfolioMutators.executeCommand({
      data: newView,
      type: 'SetBrowsePoolsView',
    });
  }, [poolsView, portfolioMutators]);

  return useMemo(
    () => ({
      poolsView,
      switchPoolsView,
    }),
    [poolsView, switchPoolsView]
  );
};

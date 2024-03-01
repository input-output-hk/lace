import { useEffect, useState } from 'react';
import { StakingPage } from '../../staking/types';
import { PoolsFilter, QueryStakePoolsFilters, activePageSelector, useDelegationPortfolioStore } from '../../store';
import { useBrowsePools } from '../hooks';
import { BrowsePoolsPreferencesCard } from './BrowsePoolsPreferencesCard';
import { SortAndFilterTab } from './types';

export const BrowsePoolsPreferencesCardContainer = () => {
  const activePage = useDelegationPortfolioStore(activePageSelector);

  const { sort, setSort, loadMoreData } = useBrowsePools();
  const [activeTab, setActiveTab] = useState<SortAndFilterTab>(SortAndFilterTab.sort);
  const [filter, setFilter] = useState<QueryStakePoolsFilters>({
    [PoolsFilter.Saturation]: ['', ''],
    [PoolsFilter.ProfitMargin]: ['', ''],
    [PoolsFilter.Performance]: ['', ''],
    [PoolsFilter.Ros]: ['lastepoch'],
  });

  // TODO to be removed after we have sorting and filtering in useDelegationPortfolioStore
  useEffect(() => {
    loadMoreData({ endIndex: 50, startIndex: 0 });
  }, [sort, loadMoreData]);

  if (activePage !== StakingPage.browsePools) return null;

  return (
    <BrowsePoolsPreferencesCard
      activeTab={activeTab}
      sort={sort}
      filter={filter}
      onSortChange={setSort}
      onFilterChange={setFilter}
      onTabChange={setActiveTab}
    />
  );
};

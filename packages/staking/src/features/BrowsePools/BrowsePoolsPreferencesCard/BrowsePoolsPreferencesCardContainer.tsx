import { StakingPage } from 'features/staking';
import { PoolsFilter, QueryStakePoolsFilters, activePageSelector, useDelegationPortfolioStore } from 'features/store';
import { useState } from 'react';
import { useQueryStakePools } from '../hooks';
import { BrowsePoolsPreferencesCard } from './BrowsePoolsPreferencesCard';
import { SortAndFilterTab } from './types';

export const BrowsePoolsPreferencesCardContainer = () => {
  const activePage = useDelegationPortfolioStore(activePageSelector);

  const { sort, setSort } = useQueryStakePools();
  const [activeTab, setActiveTab] = useState<SortAndFilterTab>(SortAndFilterTab.sort);
  // TODO move filters to the store + useQueryStakePools when SDK is ready
  const [filter, setFilter] = useState<QueryStakePoolsFilters>({
    [PoolsFilter.Saturation]: ['', ''],
    [PoolsFilter.ProfitMargin]: ['', ''],
    [PoolsFilter.Performance]: ['', ''],
    [PoolsFilter.Ros]: ['lastepoch'],
  });

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

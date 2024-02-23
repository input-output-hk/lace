import { useState } from 'react';
import { StakingPage } from '../../staking/types';
import { activePageSelector, useDelegationPortfolioStore } from '../../store';
import { SortDirection, SortField, StakePoolSortOptions } from '../types';
import { BrowsePoolsPreferencesCard } from './BrowsePoolsPreferencesCard';
import { FilterValues, PoolsFilter, SortAndFilterTab } from './types';

export const BrowsePoolsPreferencesCardContainer = () => {
  const activePage = useDelegationPortfolioStore(activePageSelector);

  const [activeTab, setActiveTab] = useState<SortAndFilterTab>(SortAndFilterTab.sort);
  const [sort, setSort] = useState<StakePoolSortOptions>({
    field: SortField.saturation,
    order: SortDirection.asc,
  });
  const [filter, setFilter] = useState<FilterValues>({
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

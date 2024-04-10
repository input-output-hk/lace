import { initI18n } from 'features/i18n';
import { StakingPage } from 'features/staking';
import { SetupBase } from 'features/staking/Setup/SetupBase';
import { PoolsFilter, QueryStakePoolsFilters, activePageSelector, useDelegationPortfolioStore } from 'features/store';
import { useState } from 'react';
import { useQueryStakePools } from '../hooks';
import { BrowsePoolsPreferencesCard } from './BrowsePoolsPreferencesCard';
import { SortAndFilterTab } from './types';
initI18n();

export const BrowsePoolsPreferencesCardContainer = ({ theme }: { theme: 'light' | 'dark' }) => {
  const activePage = useDelegationPortfolioStore(activePageSelector);

  const { sort, setSort } = useQueryStakePools();
  const [activeTab, setActiveTab] = useState<SortAndFilterTab>(SortAndFilterTab.sort);
  // TODO move filters to the store + useQueryStakePools when SDK is ready; https://input-output.atlassian.net/browse/LW-9242
  const [filter, setFilter] = useState<QueryStakePoolsFilters>({
    [PoolsFilter.Saturation]: ['', ''],
    [PoolsFilter.ProfitMargin]: ['', ''],
    [PoolsFilter.Performance]: ['', ''],
    [PoolsFilter.Ros]: ['lastepoch'],
  });

  if (activePage !== StakingPage.browsePools) return null;

  return (
    <SetupBase theme={theme}>
      <BrowsePoolsPreferencesCard
        activeTab={activeTab}
        sort={sort}
        filter={filter}
        onSortChange={setSort}
        onFilterChange={setFilter}
        onTabChange={setActiveTab}
      />
    </SetupBase>
  );
};

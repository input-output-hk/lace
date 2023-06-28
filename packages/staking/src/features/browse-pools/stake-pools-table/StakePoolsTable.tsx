import { Wallet } from '@lace/cardano';
import { getRandomIcon } from '@lace/common';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StakePoolsTableEmpty } from './StakePoolsTableEmpty';
import { StakePoolSortOptions, StakePoolTableBrowser, StakePoolTableBrowserProps } from './StakePoolTableBrowser';

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'apy',
  order: 'desc',
};

type StakePoolsTableProps = {
  stakePools: Wallet.Cardano.StakePool[];
  loadMoreData: StakePoolTableBrowserProps['loadMoreData'];
  isSearching: boolean;
  totalResultCount: number;
  fetchingPools: boolean;
  isLoadingList: boolean;
  scrollableTargetId: string;
};

const cardanoCoin = {
  decimals: 6,
  id: '1',
  name: 'Cardano',
  symbol: 'tADA',
};

export const StakePoolsTable = ({
  stakePools,
  loadMoreData,
  totalResultCount,
  isSearching,
  fetchingPools,
  isLoadingList,
  scrollableTargetId,
}: StakePoolsTableProps) => {
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const { t } = useTranslation();
  const tableHeaderTranslations = {
    apy: t('browsePools.stakePoolTableBrowser.tableHeader.ros'),
    cost: t('browsePools.stakePoolTableBrowser.tableHeader.cost'),
    poolName: t('browsePools.stakePoolTableBrowser.tableHeader.poolName'),
    saturation: t('browsePools.stakePoolTableBrowser.tableHeader.saturation'),
  };

  const items = useMemo(
    () =>
      stakePools.map((pool) => {
        const stakePool = Wallet.util.stakePoolTransformer({
          cardanoCoin,
          stakePool: pool,
        });
        const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });

        return {
          ...stakePool,
          logo,
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onClick: () => {},
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onStake: () => {},
        };
      }),
    [stakePools]
  );

  return (
    <StakePoolTableBrowser
      items={items}
      loadMoreData={loadMoreData}
      locale={{ emptyText: true }}
      // TODO: there are too many loading states and it's confusing, we should refactor this and reduce them
      // do not show loader if we are already searching/filtering
      total={isSearching ? 0 : totalResultCount}
      emptyPlaceholder={!fetchingPools && !isSearching && <StakePoolsTableEmpty />}
      // Show skeleton if it's loading the list while a search is not being performed
      showSkeleton={isLoadingList && !isSearching}
      scrollableTargetId={scrollableTargetId}
      translations={tableHeaderTranslations}
      activeSort={sort}
      setActiveSort={setSort}
    />
  );
};

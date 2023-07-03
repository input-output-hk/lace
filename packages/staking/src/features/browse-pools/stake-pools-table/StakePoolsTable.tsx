import { Wallet } from '@lace/cardano';
import { getRandomIcon } from '@lace/common';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useStakePoolDetails } from '../../store';
import { StakePoolsTableEmpty } from './StakePoolsTableEmpty';
import { StakePoolSortOptions, StakePoolTableBrowser, StakePoolTableBrowserProps } from './StakePoolTableBrowser';

type StakePoolsTableProps = {
  stakePools: Wallet.Cardano.StakePool[];
  loadMoreData: StakePoolTableBrowserProps['loadMoreData'];
  isSearching: boolean;
  totalResultCount: number;
  fetchingPools: boolean;
  isLoadingList: boolean;
  scrollableTargetId: string;
  sort: StakePoolSortOptions;
  setSort: (options: StakePoolSortOptions) => void;
};

export const StakePoolsTable = ({
  stakePools,
  loadMoreData,
  totalResultCount,
  isSearching,
  fetchingPools,
  isLoadingList,
  scrollableTargetId,
  sort,
  setSort,
}: StakePoolsTableProps) => {
  const { delegationStoreSetSelectedStakePool, walletStoreWalletUICardanoCoin } = useOutsideHandles();
  const { setIsDrawerVisible } = useStakePoolDetails();
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
          cardanoCoin: walletStoreWalletUICardanoCoin,
          stakePool: pool,
        });
        const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });

        return {
          ...stakePool,
          logo,
          onClick: () => {
            delegationStoreSetSelectedStakePool({ ...pool, logo });
            setIsDrawerVisible(true);
          },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onStake: () => {},
        };
      }),
    [delegationStoreSetSelectedStakePool, setIsDrawerVisible, stakePools, walletStoreWalletUICardanoCoin]
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

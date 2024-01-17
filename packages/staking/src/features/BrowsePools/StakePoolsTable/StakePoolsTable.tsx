import { useTranslation } from 'react-i18next';
import { StakePoolTableBrowser } from './StakePoolTableBrowser';
import { StakePoolTableItemBrowserProps } from './StakePoolTableBrowser/types';
import { StakePoolSortOptions } from './types';

type StakePoolsTableProps = {
  scrollableTargetId: string;
  sort: StakePoolSortOptions;
  setSort: (option: StakePoolSortOptions) => void;
  loadMoreData: () => Promise<void>;
  list: StakePoolTableItemBrowserProps[];
  totalResultCount: number;
  showSkeleton: boolean;
};

export const StakePoolsTable = ({
  scrollableTargetId,
  sort,
  setSort,
  loadMoreData,
  list,
  totalResultCount,
  showSkeleton,
}: StakePoolsTableProps) => {
  const { t } = useTranslation();
  const tableHeaderTranslations = {
    apy: t('browsePools.stakePoolTableBrowser.tableHeader.ros.title'),
    blocks: t('browsePools.stakePoolTableBrowser.tableHeader.blocks.title'),
    cost: t('browsePools.stakePoolTableBrowser.tableHeader.cost'),
    liveStake: t('browsePools.stakePoolTableBrowser.tableHeader.liveStake.title'),
    margin: t('browsePools.stakePoolTableBrowser.tableHeader.margin.title'),
    pledge: t('browsePools.stakePoolTableBrowser.tableHeader.pledge.title'),
    saturation: t('browsePools.stakePoolTableBrowser.tableHeader.saturation.title'),
    ticker: t('browsePools.stakePoolTableBrowser.tableHeader.ticker'),
  };

  return (
    <StakePoolTableBrowser
      data-testid="stake-pool-table"
      items={list}
      loadMoreData={loadMoreData}
      locale={{ emptyText: true }}
      // TODO: there are too many loading states and it's confusing, we should refactor this and reduce them
      // do not show loader if we are already searching/filtering
      total={totalResultCount}
      // Show skeleton if it's loading the list while a search is not being performed
      showSkeleton={showSkeleton}
      scrollableTargetId={scrollableTargetId}
      translations={tableHeaderTranslations}
      activeSort={sort}
      setActiveSort={setSort}
    />
  );
};

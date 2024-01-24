import { PostHogAction } from '@lace/common';
import React from 'react';
import { ListRange } from 'react-virtuoso';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../../store';
import { StakePoolPlaceholder } from '../StakePoolPlaceholder/StakePoolPlaceholder';
import { TableBody } from '../Table/Table';
import { Columns, StakePoolSortOptions, TranslationsFor } from '../types';
import { config } from '../utils';
import * as styles from './StakePoolTableBrowser.css';
import { StakePoolTableHeaderBrowser } from './StakePoolTableHeaderBrowser';
import { StakePoolTableItemBrowser } from './StakePoolTableItemBrowser';
import { StakePoolTableItemBrowserProps } from './types';

export type StakePoolTableBrowserProps = {
  scrollableTargetId: string;
  pools: (StakePoolTableItemBrowserProps | undefined)[];
  selectedPools: StakePoolTableItemBrowserProps[];
  loadMoreData: (range: ListRange) => void;
  translations: TranslationsFor<Columns>;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  emptyPlaceholder?: React.ReactNode;
};

export const StakePoolTableBrowser = ({
  emptyPlaceholder,
  loadMoreData,
  pools,
  selectedPools,
  translations,
  activeSort,
  setActiveSort,
  scrollableTargetId,
}: StakePoolTableBrowserProps): React.ReactElement => {
  const { analytics } = useOutsideHandles();

  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
  }));
  const selectedStakePools: StakePoolTableItemBrowserProps[] = selectedPools.map((pool) => ({
    ...pool,
    onSelect: () => {
      portfolioMutators.executeCommand({ data: pool.hexId, type: 'UnselectPoolFromList' });
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsUnselectClick);
    },
  }));

  return (
    <div className={styles.stakepoolTable} data-testid="stake-pool-list-container">
      <StakePoolTableHeaderBrowser {...{ activeSort, setActiveSort, translations }} />
      {selectedStakePools?.length > 0 && (
        <div className={styles.selectedPools}>
          {selectedStakePools.map((pool) => (
            <StakePoolTableItemBrowser key={pool.id} {...{ ...pool, selected: true }} />
          ))}
        </div>
      )}
      {!(selectedStakePools.length > 0 && selectedStakePools.length === pools.length) && emptyPlaceholder}
      <TableBody<StakePoolTableItemBrowserProps | undefined>
        scrollableTargetId={scrollableTargetId}
        loadMoreData={loadMoreData}
        items={pools}
        itemContent={(_index, data) =>
          data ? (
            <StakePoolTableItemBrowser {...data} hideSelected />
          ) : (
            <StakePoolPlaceholder columns={config.columns} withSelection />
          )
        }
      />
    </div>
  );
};

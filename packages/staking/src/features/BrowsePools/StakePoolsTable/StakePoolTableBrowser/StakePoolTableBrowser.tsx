import { Table } from '@lace/ui';
import React from 'react';
import { ListRange } from 'react-virtuoso';
import { StakePoolPlaceholder } from '../StakePoolPlaceholder/StakePoolPlaceholder';
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
}: StakePoolTableBrowserProps): React.ReactElement => (
  <div className={styles.stakepoolTable} data-testid="stake-pool-list-container">
    <StakePoolTableHeaderBrowser {...{ activeSort, setActiveSort, translations }} />
    {selectedPools?.length > 0 && (
      <div className={styles.selectedPools}>
        {selectedPools.map((pool) => (
          <StakePoolTableItemBrowser key={pool.id} {...{ ...pool, selected: true }} />
        ))}
      </div>
    )}
    {!(selectedPools.length > 0 && selectedPools.length === pools.length) && emptyPlaceholder}
    <Table.Body<StakePoolTableItemBrowserProps | undefined>
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
      increaseViewportBy={{ bottom: 100, top: 0 }}
    />
  </div>
);

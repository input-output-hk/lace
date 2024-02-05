import { Box, Table, Text } from '@lace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListRange } from 'react-virtuoso';
import { StakePoolPlaceholder } from '../StakePoolPlaceholder/StakePoolPlaceholder';
import { MetricType, StakePoolSortOptions, TranslationsFor } from '../types';
import { config } from '../utils';
import * as styles from './StakePoolsList.css';
import { StakePoolsListHeader } from './StakePoolsListHeader';
import { StakePoolsListRow } from './StakePoolsListRow';
import { StakePoolsListRowProps } from './types';

export type StakePoolsListProps = {
  scrollableTargetId: string;
  pools: (StakePoolsListRowProps | undefined)[];
  selectedPools: StakePoolsListRowProps[];
  loadMoreData: (range: ListRange) => void;
  translations: TranslationsFor<MetricType>;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  emptyPlaceholder?: React.ReactNode;
};

export const StakePoolsList = ({
  emptyPlaceholder,
  loadMoreData,
  pools,
  selectedPools,
  translations,
  activeSort,
  setActiveSort,
  scrollableTargetId,
}: StakePoolsListProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={styles.stakePoolList} data-testid="stake-pools-list-container">
      <StakePoolsListHeader {...{ activeSort, setActiveSort, translations }} />
      {selectedPools?.length > 0 && (
        <>
          <Text.Body.Normal className={styles.selectedTitle} weight="$bold">
            {t('browsePools.stakePoolGrid.selected')}
          </Text.Body.Normal>
          <Box mt="$16" className={styles.selectedPools}>
            {selectedPools.map((pool) => (
              <StakePoolsListRow key={pool.id} {...{ ...pool, selected: true }} />
            ))}
          </Box>
        </>
      )}
      {!(selectedPools.length > 0 && selectedPools.length === pools.length) && emptyPlaceholder}
      <Table.Body<StakePoolsListRowProps | undefined>
        scrollableTargetId={scrollableTargetId}
        loadMoreData={loadMoreData}
        items={pools}
        itemContent={(_index, data) =>
          data ? <StakePoolsListRow {...data} /> : <StakePoolPlaceholder columns={config.columns} withSelection />
        }
        increaseViewportBy={{ bottom: 100, top: 0 }}
      />
    </div>
  );
};

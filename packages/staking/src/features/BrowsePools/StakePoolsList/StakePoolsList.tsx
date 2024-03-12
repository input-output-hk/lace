import { Box, Flex, Table, Text } from '@lace/ui';
import React, { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ListRange } from 'react-virtuoso';
import { StakePoolDetails } from '../../store';
import { SortField, StakePoolSortOptions, TranslationsFor } from '../types';
import { config } from './config';
import * as styles from './StakePoolsList.css';
import { StakePoolsListHeader } from './StakePoolsListHeader';
import { StakePoolsListRow } from './StakePoolsListRow';
import { StakePoolsListRowSkeleton } from './StakePoolsListRowSkeleton';

export type StakePoolsListProps = {
  scrollableTargetId: string;
  pools: (StakePoolDetails | undefined)[];
  selectedPools: StakePoolDetails[];
  loadMoreData: (range: ListRange) => void;
  translations: TranslationsFor<SortField>;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  emptyPlaceholder: () => ReactElement;
  showSkeleton?: boolean;
};

export const StakePoolsList = ({
  emptyPlaceholder: EmptyPlaceholder,
  loadMoreData,
  pools,
  selectedPools,
  translations,
  activeSort,
  setActiveSort,
  showSkeleton,
  scrollableTargetId,
}: StakePoolsListProps): React.ReactElement => {
  const { t } = useTranslation();
  const showEmptyPlaceholder = !showSkeleton && pools.length === 0;

  return (
    <Box w="$fill" data-testid="stake-pools-list-container">
      {selectedPools?.length > 0 && (
        <Box w="$fill" pb="$6">
          <Text.Body.Normal className={styles.selectedTitle} weight="$semibold">
            {t('browsePools.stakePoolGrid.selected')}
          </Text.Body.Normal>
        </Box>
      )}
      {!showEmptyPlaceholder && <StakePoolsListHeader {...{ activeSort, setActiveSort, translations }} />}
      {selectedPools?.length > 0 && (
        <Flex
          flexDirection="column"
          alignItems="stretch"
          mb="$24"
          pb="$16"
          className={styles.selectedPools}
          data-testid="selected-pools-list"
        >
          {selectedPools.map((pool) => (
            <StakePoolsListRow key={pool.id} {...{ ...pool, selected: true }} />
          ))}
        </Flex>
      )}
      {showEmptyPlaceholder && <EmptyPlaceholder />}
      {showSkeleton ? (
        Array.from({ length: 4 }).map((_, index) => (
          <StakePoolsListRowSkeleton key={index} index={index} columns={config.columns} withSelection />
        ))
      ) : (
        <Table.Body<StakePoolDetails | undefined>
          scrollableTargetId={scrollableTargetId}
          loadMoreData={loadMoreData}
          items={pools}
          itemContent={(index, data) =>
            data ? (
              <StakePoolsListRow {...data} />
            ) : (
              <StakePoolsListRowSkeleton index={index} columns={config.columns} withSelection />
            )
          }
          increaseViewportBy={{ bottom: 100, top: 0 }}
        />
      )}
    </Box>
  );
};

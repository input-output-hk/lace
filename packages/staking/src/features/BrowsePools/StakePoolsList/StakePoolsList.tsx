import { Box, Flex, Table, Text } from '@lace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListRange } from 'react-virtuoso';
import { MetricType, StakePoolSortOptions, TranslationsFor } from '../types';
import { config } from './config';
import * as styles from './StakePoolsList.css';
import { StakePoolsListHeader } from './StakePoolsListHeader';
import { StakePoolsListRow } from './StakePoolsListRow';
import { StakePoolsListRowSkeleton } from './StakePoolsListRowSkeleton';
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
    <Box w="$fill" data-testid="stake-pools-list-container">
      {selectedPools?.length > 0 && (
        <Box w="$fill" pb="$6">
          <Text.Body.Normal className={styles.selectedTitle} weight="$semibold">
            {t('browsePools.stakePoolGrid.selected')}
          </Text.Body.Normal>
        </Box>
      )}
      <StakePoolsListHeader {...{ activeSort, setActiveSort, translations }} />
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
      {!(selectedPools.length > 0 && selectedPools.length === pools.length) && emptyPlaceholder}
      <Table.Body<StakePoolsListRowProps | undefined>
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
    </Box>
  );
};

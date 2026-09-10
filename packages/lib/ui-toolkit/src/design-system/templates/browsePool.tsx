import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';

import { spacing } from '../../design-tokens';
import { Column, Loader, Text } from '../atoms';
import {
  EmptyStateMessage,
  PoolCard,
  SearchBar,
  NetworkInfoCard,
  type NetworkInfoCardProps,
} from '../molecules';
import { GenericFlashList } from '../organisms';

import type { Theme } from '../../design-tokens';
import type { BrowsePoolSortOption } from '../util/types';
import type { LaceBrowsePool } from '@lace-contract/cardano-stake-pools';

export interface BrowsePoolProps {
  data: LaceBrowsePool[];
  cardVariant?: BrowsePoolSortOption;
  displayLovelaces: (lovelaces: number) => string;
  isLoading?: boolean;
  /** The catalogue is still streaming in: a loader renders under the list. */
  isFetchingMore?: boolean;
  numberOfColumns: number;
  searchPlaceholder: string;
  theme: Theme;
  networkInfoValues: NetworkInfoCardProps;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onFilterPress?: () => void;
  onPoolPress: (poolId: string) => void;
  hasActiveFilters?: boolean;
  /**
   * States what picking a pool will do, above the list. Present when another
   * flow sent the user here to CHOOSE a pool rather than browse: the list is
   * then the flow's own step, and it has to say so — nothing else on screen
   * explains why the user is looking at pools.
   */
  notice?: string;
  /** Bottom sheet scroll integration (native only). Pass from useBottomSheetScrollableCreator when inside BottomSheet. */
  renderScrollComponent?: React.ComponentType<ScrollViewProps>;
}

export const BrowsePoolTemplate = ({
  data,
  cardVariant,
  displayLovelaces,
  isLoading = false,
  isFetchingMore = false,
  numberOfColumns,
  searchPlaceholder,
  theme,
  networkInfoValues,
  searchValue,
  onSearchChange,
  onFilterPress,
  onPoolPress,
  hasActiveFilters = false,
  notice,
  renderScrollComponent,
}: BrowsePoolProps) => {
  const { t } = useTranslation();
  const saturationPlaceholder = t('v2.pages.browse-pool.pool-card.sat');
  const defaultStyles = useMemo(() => styles({ theme }), [theme]);

  const renderItem = useCallback(
    ({ item }: { item: LaceBrowsePool }) => (
      <View style={defaultStyles.cardWrapper}>
        <PoolCard
          cardStyle={defaultStyles.cardStyle}
          displayLovelaces={displayLovelaces}
          onPress={onPoolPress}
          placeholder={saturationPlaceholder}
          pool={item}
          variant={cardVariant}
        />
      </View>
    ),
    [
      cardVariant,
      defaultStyles,
      displayLovelaces,
      onPoolPress,
      saturationPlaceholder,
    ],
  );

  const searchBarActions = useMemo(
    () =>
      onFilterPress
        ? [
            {
              iconName: 'Filter' as const,
              onPress: onFilterPress,
              testID: 'browse-pool-filter-button',
              hasAscendingColor: hasActiveFilters,
            },
          ]
        : [],
    [onFilterPress, hasActiveFilters],
  );

  const ListEmptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <Column
          alignItems="center"
          justifyContent="center"
          style={defaultStyles.loadingContainer}>
          <Loader />
        </Column>
      );
    }

    if (data.length === 0) {
      return (
        <EmptyStateMessage
          message={t('v2.pages.browse-pool.empty-state.no-pools-found')}
          style={defaultStyles.emptyStateContainer}
        />
      );
    }

    return null;
  }, [
    isLoading,
    data.length,
    defaultStyles.emptyStateContainer,
    defaultStyles.loadingContainer,
    t,
  ]);

  const ListFooterComponent = useMemo(() => {
    if (!isFetchingMore) return null;
    return (
      <Column
        alignItems="center"
        justifyContent="center"
        style={defaultStyles.footerLoader}
        testID="browse-pool-fetching-more">
        <Loader />
      </Column>
    );
  }, [isFetchingMore, defaultStyles.footerLoader]);

  const ListHeaderComponent = useMemo(
    () => (
      <Column style={defaultStyles.contentWrapper}>
        {/* First thing read, above the epoch card: it answers "why am I
            looking at pools?" for a user the flow sent straight here. */}
        {notice !== undefined && (
          <Text.S variant="secondary" testID="browse-pool-notice">
            {notice}
          </Text.S>
        )}
        <NetworkInfoCard {...networkInfoValues} />
        <SearchBar
          placeholder={searchPlaceholder}
          value={searchValue}
          onChangeText={onSearchChange}
          extraStyle={defaultStyles.searchBar}
          actions={searchBarActions}
        />
      </Column>
    ),
    [
      defaultStyles.contentWrapper,
      defaultStyles.searchBar,
      networkInfoValues,
      notice,
      searchPlaceholder,
      searchValue,
      onSearchChange,
      searchBarActions,
    ],
  );

  return (
    <View style={defaultStyles.container} testID="browse-pool-content">
      <GenericFlashList
        testID="browse-pool-list"
        renderItem={renderItem}
        data={data}
        keyExtractor={(item: LaceBrowsePool) => item.poolId}
        numColumns={numberOfColumns}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={defaultStyles.listElements}
        style={defaultStyles.list}
        renderScrollComponent={renderScrollComponent}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{ disabled: true }}
      />
    </View>
  );
};

/**
 * BrowsePool with bottom sheet scroll integration via useBottomSheetScrollableCreator.
 * Use only on native when rendered inside BottomSheet. On web, use BrowsePoolTemplate.
 */
export const BrowsePoolSheetContent = (props: BrowsePoolProps) => {
  return <BrowsePoolTemplate {...props} />;
};

const styles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background.page,
    },
    list: {
      flex: 1,
    },
    cardWrapper: {
      flex: 1,
      margin: spacing.S,
    },
    cardStyle: {
      boxShadow: `0 0 10px 0 ${theme.extra.shadowDrop}`,
      shadowRadius: 3,
      backgroundColor: theme.background.primary,
    },
    contentWrapper: {
      marginHorizontal: spacing.S,
      gap: spacing.M,
      paddingVertical: spacing.M,
    },
    listElements: {
      paddingBottom: spacing.XXXXL,
    },
    searchBar: {
      flex: 1,
    },
    emptyStateContainer: {
      paddingVertical: spacing.XL,
      paddingHorizontal: spacing.M,
    },
    footerLoader: {
      paddingVertical: spacing.L,
    },
    loadingContainer: {
      paddingVertical: spacing.XXXL,
    },
  });

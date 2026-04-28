import { useBottomSheetScrollableCreator } from '@gorhom/bottom-sheet';
import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';

import { spacing } from '../../design-tokens';
import { Column, Loader } from '../atoms';
import {
  EmptyStateMessage,
  PoolCard,
  SearchBar,
  NetworkInfoCard,
  type NetworkInfoCardProps,
} from '../molecules';
import { GenericFlashList } from '../organisms';
import { useScrollEventsHandlers } from '../organisms/sheet/useScrollEventsHandlers';

import type { Theme } from '../../design-tokens';
import type { BrowsePoolSortOption, LaceBrowsePool } from '../util/types';

export interface BrowsePoolProps {
  data: LaceBrowsePool[];
  cardVariant?: BrowsePoolSortOption;
  displayLovelaces: (lovelaces: number) => string;
  isLoading?: boolean;
  numberOfColumns: number;
  searchPlaceholder: string;
  theme: Theme;
  networkInfoValues: NetworkInfoCardProps;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onFilterPress?: () => void;
  onPoolPress: (poolId: string) => void;
  hasActiveFilters?: boolean;
  /** Bottom sheet scroll integration (native only). Pass from useBottomSheetScrollableCreator when inside BottomSheet. */
  renderScrollComponent?: React.ComponentType<ScrollViewProps>;
}

export const BrowsePoolTemplate = ({
  data,
  cardVariant,
  displayLovelaces,
  isLoading = false,
  numberOfColumns,
  searchPlaceholder,
  theme,
  networkInfoValues,
  searchValue,
  onSearchChange,
  onFilterPress,
  onPoolPress,
  hasActiveFilters = false,
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

  const ListHeaderComponent = useMemo(
    () => (
      <Column style={defaultStyles.contentWrapper}>
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
  const renderScrollComponent = useBottomSheetScrollableCreator({
    scrollEventsHandlersHook: useScrollEventsHandlers,
  });
  return (
    <BrowsePoolTemplate
      {...props}
      renderScrollComponent={renderScrollComponent}
    />
  );
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
      paddingBottom: spacing.M,
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
    loadingContainer: {
      paddingVertical: spacing.XXXL,
    },
  });

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../design-tokens';
import {
  EmptyStateMessage,
  NetworkInfoCard,
  PageHeaderSection,
  SearchBar,
  StakeCard,
  StakingStatusCard,
} from '../molecules';
import { GenericFlashList, TabBarMetrics } from '../organisms';
import { usePageHeaderCollapseScroll } from '../util';

import { PageContainerTemplate } from './pageContainerTemplate/pageContainerTemplate';

import type { NetworkInfoCardProps } from '../molecules/networkInfoCard/networkInfoCard';
import type { StakeCardProps } from '../molecules/stakeCard/stakeCard';
import type { StakingStatusCardProps } from '../molecules/stakingStatusCard/stakingStatusCard';

interface StakeCenterMainProps {
  searchValue?: string;
  debouncedSearchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearchBar?: boolean;
  networkInfoCard?: NetworkInfoCardProps;
  stakingStatusCard: StakingStatusCardProps;
  stakeCards: StakeCardProps[];
}

export const StakeCenterMain = ({
  searchValue,
  debouncedSearchValue,
  onSearchChange,
  searchPlaceholder,
  showSearchBar,
  networkInfoCard,
  stakingStatusCard,
  stakeCards,
}: StakeCenterMainProps) => {
  const { t } = useTranslation();
  const shouldShowSearch = showSearchBar ?? stakeCards.length > 1;

  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        {networkInfoCard && (
          <View style={styles.networkInfoCardWrapper}>
            <NetworkInfoCard {...networkInfoCard} />
          </View>
        )}
        <StakingStatusCard {...stakingStatusCard} />
      </View>
    ),
    [networkInfoCard, stakingStatusCard],
  );

  const keyExtractor = useCallback(
    (item: StakeCardProps, index: number) =>
      item.testID ?? `stake-card-${index}`,
    [],
  );

  const renderItem = useCallback(({ item }: { item: StakeCardProps }) => {
    return <StakeCard {...item} />;
  }, []);

  const ListEmptyComponent = useMemo(
    () =>
      debouncedSearchValue ? (
        <EmptyStateMessage
          message={t('v2.generic.staking.center.empty-state.no-accounts-found')}
          style={styles.emptyStateContainer}
        />
      ) : null,
    [debouncedSearchValue, t],
  );

  const { collapseScrollY, onScroll } = usePageHeaderCollapseScroll();

  const headerSection = useMemo(
    () => (
      <PageHeaderSection
        title={t('v2.generic.staking.card.title')}
        reserveSubtitleSpace
        testID="stake-center-header-section"
        collapseScrollY={collapseScrollY}
        stickyInScrollParent
        contentStyle={
          shouldShowSearch ? undefined : styles.headerSectionContent
        }>
        {shouldShowSearch ? (
          <SearchBar
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            testID="stake-center-search-bar"
          />
        ) : null}
      </PageHeaderSection>
    ),
    [
      searchValue,
      onSearchChange,
      searchPlaceholder,
      shouldShowSearch,
      t,
      collapseScrollY,
    ],
  );

  return (
    <PageContainerTemplate>
      <View style={styles.content}>
        <View style={styles.fillSpace}>
          {headerSection}
          <GenericFlashList<StakeCardProps>
            style={styles.list}
            data={stakeCards}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={ListEmptyComponent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            contentContainerStyle={styles.listContent}
            onScroll={onScroll}
            scrollEventThrottle={16}
          />
        </View>
      </View>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  fillSpace: {
    flex: 1,
  },
  list: {
    flex: 1,
    marginHorizontal: -spacing.M,
  },
  headerSectionContent: {
    paddingBottom: 0,
  },
  listContent: {
    paddingTop: spacing.M,
    paddingHorizontal: spacing.M,
    paddingBottom: TabBarMetrics.horizontal.height + spacing.XL,
  },
  itemSeparator: {
    height: spacing.L,
  },
  listHeader: {
    paddingBottom: spacing.L,
  },
  networkInfoCardWrapper: {
    paddingBottom: spacing.L,
  },
  emptyStateContainer: {
    paddingVertical: spacing.XL,
  },
});

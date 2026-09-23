import type { RefreshControlProps } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

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
  /**
   * Aggregate staking status header card. Optional: omitted on the Staking
   * Center hub (which lists only staking-option cards), present on the Cardano
   * staking detail page.
   */
  stakingStatusCard?: StakingStatusCardProps;
  stakeCards: StakeCardProps[];
  /** Pull-to-refresh control, forwarded to the card list. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Back affordance in the header — set when shown as a stack sub-page. */
  onBack?: () => void;
  /** Override the header title (defaults to the staking-center title). */
  title?: string;
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
  refreshControl,
  onBack,
  title,
}: StakeCenterMainProps) => {
  const { t } = useTranslation();
  const listData = useMemo(() => stakeCards, [stakeCards]);
  const shouldShowSearch = showSearchBar ?? listData.length > 1;

  const ListHeaderComponent = useMemo(() => {
    if (!networkInfoCard && !stakingStatusCard) return null;
    return (
      <View style={styles.listHeader}>
        {networkInfoCard && (
          <View style={styles.networkInfoCardWrapper}>
            <NetworkInfoCard {...networkInfoCard} />
          </View>
        )}
        {stakingStatusCard && <StakingStatusCard {...stakingStatusCard} />}
      </View>
    );
  }, [networkInfoCard, stakingStatusCard]);

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

  // On web the @react-navigation/stack card wrapper grows to its content height
  // instead of clamping to the scene, so flex:1 never gives the FlashList a
  // bounded box and the page can't scroll (same bug as UsdrStakingDetail). Pin
  // the body to the window height there; native keeps flex:1 (the host bounds it).
  const { height: windowHeight } = useWindowDimensions();

  const headerSection = useMemo(
    () => (
      <PageHeaderSection
        title={title ?? t('v2.generic.staking.card.title')}
        reserveSubtitleSpace
        testID="stake-center-header-section"
        collapseScrollY={collapseScrollY}
        stickyInScrollParent
        onBackPress={onBack}
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
      onBack,
      title,
    ],
  );

  return (
    <PageContainerTemplate>
      <View
        style={
          Platform.OS === 'web' ? { height: windowHeight } : styles.content
        }>
        <View style={styles.fillSpace}>
          {headerSection}
          <GenericFlashList<StakeCardProps>
            style={styles.list}
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={ListEmptyComponent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            contentContainerStyle={styles.listContent}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={refreshControl}
          />
        </View>
      </View>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  // Native only: flex fills the scene. Web pins an explicit height (inline,
  // from windowHeight) since the stack card there won't clamp height.
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

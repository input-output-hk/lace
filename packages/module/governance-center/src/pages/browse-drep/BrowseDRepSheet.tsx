import { useAnalytics } from '@lace-contract/analytics';
import { toHttpImageUrl } from '@lace-contract/governance-center';
import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Column,
  DRepCard,
  EmptyStateMessage,
  GenericFlashList,
  Row,
  SearchBar,
  Shimmer,
  spacing,
  Sheet,
  Text,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DRepFilterDropdown } from './DRepFilterDropdown';
import { useBrowseDRep } from './useBrowseDRep';

import type { DRepSummary } from '@lace-contract/cardano-context';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const SKELETON_ITEMS = [0, 1, 2, 3];

export const BrowseDRepSheet = (
  props: SheetScreenProps<SheetRoutes.BrowseDRep>,
) => {
  const { accountId } = props.route.params;
  const { navigation } = props;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const {
    dReps,
    isLoading,
    hasError,
    retry,
    searchValue,
    onSearchChange,
    status,
    sortBy,
    setStatus,
    setSortBy,
    hasActiveFilters,
    promotedDReps,
    onSelectDRep,
  } = useBrowseDRep(accountId);

  useEffect(() => {
    trackEvent('governance | drep | browse | view');
  }, [trackEvent]);

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={t('v2.governance.browse-drep.title')} />,
    });
  }, [navigation, t]);

  const renderItem = useCallback(
    ({ item }: { item: DRepSummary }) => (
      <View style={styles.cardWrapper}>
        <DRepCard
          drepId={item.drepId}
          amount={item.amount}
          isActive={item.isActive}
          name={item.name}
          cip105DrepId={item.cip105DrepId}
          votingPowerLovelace={item.amount}
          avatarUri={toHttpImageUrl(item.metadata?.imageUrl)}
          onPress={() => {
            onSelectDRep(item.drepId);
          }}
        />
      </View>
    ),
    [onSelectDRep],
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.header}>
        {promotedDReps.length > 0 && (
          <View style={styles.promotedSection}>
            <Text.XS variant="secondary" testID="browse-drep-promoted-title">
              {t('v2.governance.browse-drep.promoted-section-title')}
            </Text.XS>
            {promotedDReps.map(({ summary, description }) => (
              <DRepCard
                key={summary.drepId}
                testID={`drep-promoted-${summary.drepId}`}
                drepId={summary.drepId}
                amount={summary.amount}
                isActive={summary.isActive}
                name={summary.name}
                cip105DrepId={summary.cip105DrepId}
                votingPowerLovelace={summary.amount}
                description={description}
                avatarUri={toHttpImageUrl(summary.metadata?.imageUrl)}
                onPress={() => {
                  onSelectDRep(summary.drepId);
                }}
              />
            ))}
          </View>
        )}
        <Row alignItems="center" gap={spacing.S}>
          <View style={styles.searchBar}>
            <SearchBar
              placeholder={t('v2.governance.browse-drep.search-placeholder')}
              value={searchValue}
              onChangeText={onSearchChange}
            />
          </View>
          <DRepFilterDropdown
            status={status}
            sortBy={sortBy}
            onStatusChange={setStatus}
            onSortByChange={setSortBy}
            isActive={hasActiveFilters}
          />
        </Row>
      </View>
    ),
    [
      t,
      promotedDReps,
      onSelectDRep,
      searchValue,
      onSearchChange,
      status,
      sortBy,
      setStatus,
      setSortBy,
      hasActiveFilters,
    ],
  );

  const ListEmptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.skeletonList} testID="browse-drep-skeleton">
          {SKELETON_ITEMS.map(index => (
            <Shimmer
              key={index}
              height={72}
              style={styles.skeletonCard}
              borderRadius={8}
            />
          ))}
        </View>
      );
    }

    // A failed fetch renders an empty list identical to "no DReps"; surface the
    // error with a manual retry (ADR 15) so the user can re-request the list.
    if (hasError) {
      return (
        <Column
          alignItems="center"
          gap={spacing.M}
          style={styles.emptyState}
          testID="browse-drep-error">
          <EmptyStateMessage message={t('v2.governance.browse-drep.error')} />
          <Button.Secondary
            label={t('v2.governance.browse-drep.retry')}
            onPress={retry}
            testID="browse-drep-retry-button"
          />
        </Column>
      );
    }

    return (
      <EmptyStateMessage
        message={t('v2.governance.browse-drep.empty')}
        style={styles.emptyState}
      />
    );
  }, [isLoading, hasError, retry, t]);

  const keyExtractor = useCallback(
    (dRep: DRepSummary) => `drep-item-${dRep.drepId}`,
    [],
  );

  return (
    <View style={styles.container} testID="browse-drep-content">
      <GenericFlashList<DRepSummary>
        style={styles.list}
        data={dReps}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{ disabled: true }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: spacing.M,
  },
  header: {
    gap: spacing.S,
    marginBottom: spacing.S,
  },
  promotedSection: {
    gap: spacing.S,
  },
  searchBar: {
    flex: 1,
  },
  cardWrapper: {
    marginBottom: spacing.S,
  },
  skeletonList: {
    gap: spacing.S,
  },
  skeletonCard: {
    width: '100%',
  },
  emptyState: {
    paddingVertical: spacing.XL,
  },
});

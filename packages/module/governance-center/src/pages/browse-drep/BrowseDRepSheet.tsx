import { useAnalytics } from '@lace-contract/analytics';
import { toHttpImageUrl } from '@lace-contract/governance-center';
import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Card,
  Column,
  DRepCard,
  EmptyStateMessage,
  GenericFlashList,
  Icon,
  Row,
  SearchBar,
  Shimmer,
  spacing,
  Sheet,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { DRepFilterDropdown } from './DRepFilterDropdown';
import { useBrowseDRep } from './useBrowseDRep';

import type {
  BrowseDRepListItem,
  DefaultDelegationOption,
} from './useBrowseDRep';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const OPTION_TEST_IDS: Record<DefaultDelegationOption['type'], string> = {
  alwaysAbstain: 'drep-option-abstain',
  alwaysNoConfidence: 'drep-option-no-confidence',
};

const DelegationOptionRow = ({
  option,
  onPress,
}: {
  option: DefaultDelegationOption;
  onPress: (type: DefaultDelegationOption['type']) => void;
}) => {
  const { theme } = useTheme();
  const handlePress = useCallback(() => {
    onPress(option.type);
  }, [onPress, option.type]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.optionPressable}
      testID={OPTION_TEST_IDS[option.type]}>
      <Card
        cardStyle={[
          styles.optionCard,
          { backgroundColor: theme.background.primary },
        ]}>
        <Row alignItems="center" gap={spacing.S}>
          <Column style={styles.optionInfo} gap={spacing.XS}>
            <Text.S>{option.title}</Text.S>
            <Text.XS variant="secondary">{option.description}</Text.XS>
          </Column>
          <Icon name="CaretRight" size={16} />
        </Row>
      </Card>
    </Pressable>
  );
};

const SKELETON_ITEMS = [0, 1, 2, 3];

export const BrowseDRepSheet = (
  props: SheetScreenProps<SheetRoutes.BrowseDRep>,
) => {
  const { accountId } = props.route.params;
  const { navigation } = props;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const {
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
    onSelectDefaultOption,
    listItems,
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
    ({ item }: { item: BrowseDRepListItem }) => {
      if (item.kind === 'option') {
        return (
          <View style={styles.cardWrapper}>
            <DelegationOptionRow
              option={item.option}
              onPress={onSelectDefaultOption}
            />
          </View>
        );
      }

      const { summary } = item;
      return (
        <View style={styles.cardWrapper}>
          <DRepCard
            drepId={summary.drepId}
            amount={summary.amount}
            isActive={summary.isActive}
            name={summary.name}
            cip105DrepId={summary.cip105DrepId}
            votingPowerLovelace={summary.amount}
            avatarUri={toHttpImageUrl(summary.metadata?.imageUrl)}
            onPress={() => {
              onSelectDRep(summary.drepId);
            }}
          />
        </View>
      );
    },
    [onSelectDRep, onSelectDefaultOption],
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
    (item: BrowseDRepListItem) =>
      item.kind === 'option'
        ? `drep-option-${item.option.type}`
        : `drep-item-${item.summary.drepId}`,
    [],
  );

  const getItemType = useCallback((item: BrowseDRepListItem) => item.kind, []);

  return (
    <View style={styles.container} testID="browse-drep-content">
      <GenericFlashList<BrowseDRepListItem>
        style={styles.list}
        data={listItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
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
  optionPressable: {
    width: '100%',
  },
  optionCard: {
    padding: spacing.M,
  },
  optionInfo: {
    flex: 1,
  },
});

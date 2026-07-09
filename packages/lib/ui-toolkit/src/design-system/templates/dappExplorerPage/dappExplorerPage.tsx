import type { ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  BlurView,
  Button,
  Column,
  DappExplorerSkeleton,
  Icon,
  Row,
  Text,
} from '../../atoms';
import {
  DAppCard,
  EmptyStateMessage,
  PageHeaderSection,
  SearchBar,
} from '../../molecules';
import { GenericFlashList } from '../../organisms';
import {
  isWeb,
  scheduleNativeListScrollToTop,
  usePageHeaderCollapseScroll,
} from '../../util';
import { PageContainerTemplate } from '../pageContainerTemplate/pageContainerTemplate';

import type { FlashListRef } from '@shopify/flash-list';

export type DappRating = {
  average_rating: number | null;
  star_count: number;
  vote_count: number;
};

export type DappExplorerDappItem = {
  kind: 'dapp';
  dappId: number | string;
  logoUrl: string;
  name: string;
  categoriesText: string;
};

export type DappExplorerSectionHeaderItem = {
  kind: 'header';
  id: string;
  label: string;
};

export type DappExplorerInfoItem = {
  kind: 'info';
  id: string;
  label: string;
  subtitle: string;
};

export type DappExplorerListItem =
  | DappExplorerDappItem
  | DappExplorerInfoItem
  | DappExplorerSectionHeaderItem;

export type DappExplorerPageTemplateProps = {
  title: string;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (searchValue: string) => void;
  onSubmitSearch?: () => void;
  onOpenFilters: () => void;
  isFilterActive: boolean;
  items: DappExplorerListItem[];
  /** When this changes (applied search / filters), the list scrolls to the top. */
  listScrollResetKey: string;
  onSelectDapp: (dappId: number | string) => void;
  testID?: string;
};

export const DappExplorerPageTemplate = ({
  title,
  isLoading,
  hasError,
  onRetry,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSubmitSearch,
  onOpenFilters,
  isFilterActive,
  items,
  listScrollResetKey,
  onSelectDapp,
  testID = 'dapp-explorer-page',
}: DappExplorerPageTemplateProps) => {
  const { theme, isSideMenu } = useTheme();
  const { t } = useTranslation();

  const { collapseScrollY, onScroll } = usePageHeaderCollapseScroll();

  const listRef = useRef<FlashListRef<DappExplorerListItem>>(null);
  const skipScrollResetRef = useRef(true);

  useEffect(() => {
    if (skipScrollResetRef.current) {
      skipScrollResetRef.current = false;
      return;
    }

    const scrollToTop = () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    };

    if (isWeb) {
      scrollToTop();
      return;
    }

    const { cancel } = scheduleNativeListScrollToTop(scrollToTop);
    return cancel;
  }, [listScrollResetKey]);

  const filterButtonContainerStyle: ViewStyle | undefined = useMemo(() => {
    if (!isFilterActive) return undefined;
    return { backgroundColor: theme.brand.ascending };
  }, [isFilterActive, theme.brand.ascending]);

  const ListEmptyComponent = useMemo(
    () =>
      searchValue || isFilterActive ? (
        <EmptyStateMessage
          message={t('v2.dapp-explorer.empty-state.no-dapps-found')}
          style={styles.emptyStateContainer}
        />
      ) : null,
    [searchValue, isFilterActive, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: DappExplorerListItem }) => {
      if (item.kind === 'header') {
        return (
          <View
            style={styles.sectionHeader}
            testID={`dapp-explorer-section-${item.id}`}>
            <Text.XS variant="secondary">{item.label}</Text.XS>
          </View>
        );
      }
      if (item.kind === 'info') {
        return (
          <View
            style={styles.dappListItemPressable}
            testID={`dapp-explorer-info-${item.id}`}>
            <BlurView
              style={[styles.infoCard, { borderColor: theme.data.negative }]}>
              <Row alignItems="center" gap={spacing.S} style={styles.infoRow}>
                <Icon
                  name="AlertTriangle"
                  variant="solid"
                  size={24}
                  color={theme.data.negative}
                />
                <Column justifyContent="center" style={styles.infoContent}>
                  <Text.S style={{ color: theme.data.negative }}>
                    {item.label}
                  </Text.S>
                  <Text.XS variant="secondary">{item.subtitle}</Text.XS>
                </Column>
              </Row>
            </BlurView>
          </View>
        );
      }
      return (
        <Pressable
          onPress={() => {
            onSelectDapp(item.dappId);
          }}
          testID={`dapp-explorer-item-${item.dappId}`}
          style={[styles.dappListItemPressable]}>
          <DAppCard
            avatarImage={item.logoUrl}
            name={item.name}
            description={item.categoriesText}
          />
        </Pressable>
      );
    },
    [onSelectDapp, theme.data.negative],
  );

  const getItemType = useCallback(
    (item: DappExplorerListItem) => item.kind,
    [],
  );

  const keyExtractor = useCallback((item: DappExplorerListItem) => {
    if (item.kind === 'header') return `header-${item.id}`;
    if (item.kind === 'info') return `info-${item.id}`;
    return item.dappId.toString();
  }, []);

  const headerSection = useMemo(() => {
    return (
      <PageHeaderSection
        stickyInScrollParent
        collapseScrollY={collapseScrollY}
        title={title}
        reserveSubtitleSpace
        testID={`${testID}-header-section`}
        pageHeaderTestID="dapp-explorer-page-header">
        <SearchBar
          value={searchValue}
          placeholder={searchPlaceholder}
          clearable
          onChangeText={onSearchChange}
          textInputProps={{
            onSubmitEditing: onSubmitSearch,
            returnKeyType: 'go',
            autoCapitalize: 'none',
            autoCorrect: false,
          }}
          actions={[
            {
              iconName: 'Sorting' as const,
              onPress: onOpenFilters,
              testID: 'dapp-explorer-filter-button',
              containerStyle: filterButtonContainerStyle,
            },
          ]}
          testID="dapp-explorer-page-header-search"
        />
      </PageHeaderSection>
    );
  }, [
    title,
    searchValue,
    searchPlaceholder,
    onSearchChange,
    onSubmitSearch,
    onOpenFilters,
    filterButtonContainerStyle,
    testID,
    collapseScrollY,
  ]);

  if (hasError) {
    return (
      <PageContainerTemplate testID={testID}>
        <Column
          alignItems="center"
          justifyContent="center"
          gap={spacing.L}
          style={styles.errorStateContainer}
          testID="dapp-explorer-error-state">
          <Icon name="Sad" size={100} variant="solid" />
          <Column alignItems="center" gap={spacing.XS}>
            <Text.M align="center" testID="dapp-explorer-error-title">
              {t('v2.dapp-explorer.error.title')}
            </Text.M>
            <Text.XS
              align="center"
              variant="secondary"
              testID="dapp-explorer-error-message">
              {t('v2.dapp-explorer.error.message')}
            </Text.XS>
          </Column>
          <Button.Primary
            fullWidth
            label={t('v2.dapp-explorer.error.retry')}
            onPress={onRetry}
            testID="dapp-explorer-error-retry"
          />
        </Column>
      </PageContainerTemplate>
    );
  }

  return (
    <PageContainerTemplate testID={testID}>
      <View style={styles.fillSpace}>
        {headerSection}
        {isLoading ? (
          <DappExplorerSkeleton />
        ) : (
          <GenericFlashList
            onScroll={onScroll}
            style={styles.fillSpace}
            data={items}
            flashListRef={listRef}
            ListEmptyComponent={ListEmptyComponent}
            gridColumns={{ compact: 1, medium: 2, large: 4 }}
            key="dapp-explorer-items"
            keyExtractor={keyExtractor}
            getItemType={getItemType}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{ disabled: true }}
            contentContainerStyle={[
              styles.itemsList,
              {
                ...(!isSideMenu && {
                  paddingBottom: spacing.XXXXL,
                }),
              },
            ]}
            renderItem={renderItem}
            scrollEventThrottle={16}
          />
        )}
      </View>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  fillSpace: {
    flex: 1,
  },
  dappListItemPressable: {
    width: '100%',
    paddingBottom: spacing.S,
    paddingHorizontal: isWeb ? spacing.XS : 0,
  },
  emptyStateContainer: {
    paddingVertical: spacing.XL,
  },
  errorStateContainer: {
    flex: 1,
    paddingHorizontal: spacing.M,
  },
  itemsList: {
    paddingTop: spacing.S,
  },
  sectionHeader: {
    paddingHorizontal: spacing.XS,
    paddingTop: spacing.S,
    paddingBottom: spacing.XS,
  },
  infoCard: {
    backgroundColor: 'transparent',
    borderRadius: radius.M,
    borderWidth: 1,
    height: 80,
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.M,
    overflow: 'hidden',
  },
  infoRow: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  infoContent: {
    flex: 1,
    minHeight: 0,
  },
});

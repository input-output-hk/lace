import type { ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Column, Loader } from '../../atoms';
import {
  DAppCard,
  EmptyStateMessage,
  PageHeaderSection,
  SearchBar,
} from '../../molecules';
import { GenericFlashList } from '../../organisms';
import { getIsDark, isWeb, scheduleNativeListScrollToTop } from '../../util';
import { PageContainerTemplate } from '../pageContainerTemplate/pageContainerTemplate';

import type { FlashListRef } from '@shopify/flash-list';

export type DappExplorerListItem = {
  dappId: number;
  logoUrl: string;
  name: string;
  categoriesText: string;
};

export type DappExplorerPageTemplateProps = {
  title: string;
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (searchValue: string) => void;
  onOpenFilters: () => void;
  isFilterActive: boolean;
  items: DappExplorerListItem[];
  /** When this changes (applied search / filters), the list scrolls to the top. */
  listScrollResetKey: string;
  onSelectDapp: (dappId: number) => void;
  testID?: string;
};

export const DappExplorerPageTemplate = ({
  title,
  isLoading,
  searchValue,
  onSearchChange,
  onOpenFilters,
  isFilterActive,
  items,
  listScrollResetKey,
  onSelectDapp,
  testID = 'dapp-explorer-page',
}: DappExplorerPageTemplateProps) => {
  const { theme, isSideMenu } = useTheme();
  const { t } = useTranslation();

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

  const isDark = getIsDark(theme);
  const defaultColor = isDark ? theme.brand.white : theme.brand.black;

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
    [onSelectDapp],
  );

  const headerSection = useMemo(() => {
    return (
      <PageHeaderSection
        title={title}
        reserveSubtitleSpace
        testID={`${testID}-header-section`}
        pageHeaderTestID="dapp-explorer-page-header">
        <SearchBar
          value={searchValue}
          onChangeText={onSearchChange}
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
    onSearchChange,
    onOpenFilters,
    filterButtonContainerStyle,
    testID,
  ]);

  return (
    <PageContainerTemplate testID={testID}>
      {isLoading ? (
        <Column
          alignItems="center"
          justifyContent="center"
          style={styles.contentContainer}>
          <Loader color={defaultColor} size={35} />
        </Column>
      ) : (
        <View style={styles.fillSpace}>
          {headerSection}
          <GenericFlashList
            style={styles.fillSpace}
            data={items}
            flashListRef={listRef}
            ListEmptyComponent={ListEmptyComponent}
            gridColumns={{ compact: 1, medium: 2, large: 4 }}
            key="dapp-explorer-items"
            keyExtractor={item => item.dappId.toString()}
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
        </View>
      )}
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  fillSpace: {
    flex: 1,
  },
  contentContainer: {
    height: '100%',
    gap: spacing.S,
  },
  dappListItemPressable: {
    width: '100%',
    paddingBottom: spacing.S,
    paddingHorizontal: isWeb ? spacing.XS : 0,
  },
  emptyStateContainer: {
    paddingVertical: spacing.XL,
  },
  itemsList: {
    paddingTop: spacing.S,
  },
});

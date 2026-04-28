import type {
  FlatList as FlatListRef,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { useConfig, useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  ActivityCard,
  CustomTag,
  formatAndGroupActivitiesByDate,
  Icon,
  isAndroid,
  Loader,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import debounce from 'lodash/debounce';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type FlatList, StyleSheet, View } from 'react-native';
import Animated, { type ScrollHandlerProcessed } from 'react-native-reanimated';

import { useDispatchLaceAction, useLaceSelector } from '../../../hooks';
import { PortfolioEmptyState } from '../empty-state';
import { getListHeaderNode } from '../utils/getListHeaderNode';

import type { ListHeaderComponentProperty, SelectedAssetView } from '../types';
import type { Activity } from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  FormattedActivityListItem,
  IconName,
  Theme,
} from '@lace-lib/ui-toolkit';

const loadingIndicatorOffset = 100;

type DateTagProps = {
  date: string;
  dateIcon?: IconName;
};

type ActivityListItem =
  | { type: 'activity'; props: FormattedActivityListItem }
  | { type: 'dateTag'; props: DateTagProps };

const keyExtractor = (item: ActivityListItem) =>
  item.type === 'activity' ? item.props.rowKey : item.props.date;

type ActivityListProps = {
  accountId: AccountId;
  activeIndex: number;
  selectedAssetView: SelectedAssetView;
  isVisible: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  ListHeaderComponent?: ListHeaderComponentProperty<ActivityListItem>;
  footerSpacerHeight?: number;
  scrollHandler: ScrollHandlerProcessed<Record<string, unknown>>;
  activities: Activity<unknown>[];
  listRef?: React.RefObject<FlatListRef | null>;
};

export const ActivitiesFlatlist = ({
  accountId,
  activeIndex,
  selectedAssetView,
  isVisible,
  containerStyle,
  style,
  ListHeaderComponent,
  footerSpacerHeight,
  scrollHandler,
  activities,
  listRef,
}: ActivityListProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const internalListRef = useRef<FlatList>(null);
  const resolvedListRef = listRef ?? internalListRef;

  useEffect(() => {
    resolvedListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeIndex, selectedAssetView, resolvedListRef]);

  const styles = useMemo(() => getStyles(theme), [theme]);

  // Load UI customizations for the account blockchain
  const [address] = useLaceSelector('addresses.selectByAccountId', accountId);
  const [activitiesItemUICustomisation] = useUICustomisation(
    'addons.loadActivitiesItemUICustomisations',
    { blockchainName: address?.blockchainName },
  );

  const tokensMetadataByTokenId = useLaceSelector(
    'tokens.selectTokensMetadata',
  );
  const isLoadingOlderActivities = useLaceSelector(
    'activities.selectIsLoadingOlderActivitiesByAccount',
    accountId,
  );

  const hasLoadedOldestEntry = useLaceSelector(
    'activities.selectHasLoadedOldestEntryByAccount',
    accountId,
  );

  const incrementDesiredLoadedActivitiesCount = useDispatchLaceAction(
    'activities.incrementDesiredLoadedActivitiesCount',
  );

  const { appConfig } = useConfig();

  const handleActivityPress = useCallback(
    (id: string) => {
      if (activitiesItemUICustomisation?.onActivityClick) {
        activitiesItemUICustomisation.onActivityClick({
          activityId: id,
          address,
          config: appConfig,
        });
        return;
      }

      NavigationControls.sheets.navigate(SheetRoutes.ActivityDetail, {
        activityId: id,
      });
    },
    [activitiesItemUICustomisation, appConfig, address],
  );

  const incrementDesiredLoadedActivitiesCountDebounced = useMemo(
    () => debounce(incrementDesiredLoadedActivitiesCount, 300),
    [incrementDesiredLoadedActivitiesCount],
  );

  const loadOlderActivities = useCallback(() => {
    if (isLoadingOlderActivities || hasLoadedOldestEntry) return;

    incrementDesiredLoadedActivitiesCountDebounced({
      accountId,
      incrementBy: ACTIVITIES_PER_PAGE,
    });
  }, [accountId, isLoadingOlderActivities, hasLoadedOldestEntry]);

  const onListEndReached = useCallback(() => {
    if (!isVisible) return;
    if (
      // Do not try to load more if we are still loading
      !isLoadingOlderActivities
    ) {
      loadOlderActivities();
    }
  }, [isVisible, isLoadingOlderActivities, loadOlderActivities]);

  const groupedActivities = useMemo(
    () =>
      formatAndGroupActivitiesByDate({
        activities,
        t,
        tokensMetadataByTokenId,
        getMainTokenBalanceChange:
          activitiesItemUICustomisation?.getMainTokenBalanceChange,
        getTokensInfoSummary:
          activitiesItemUICustomisation?.getTokensInfoSummary,
      }),
    [activities, tokensMetadataByTokenId, activitiesItemUICustomisation, t],
  );

  const activityListData = useMemo(
    () =>
      activities.length === 0
        ? []
        : groupedActivities.reduce<ActivityListItem[]>(
            (accumulator, section) => {
              accumulator.push({
                type: 'dateTag',
                props: {
                  date: section.date,
                  dateIcon: section.dateIcon,
                },
              });
              section.items.forEach(item => {
                accumulator.push({ type: 'activity', props: item });
              });
              return accumulator;
            },
            [],
          ),
    [groupedActivities],
  );

  const isEmpty = activityListData.length === 0;
  const [listHeight, setListHeight] = useState(0);

  const onListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next = Math.round(event.nativeEvent.layout.height);
      if (next !== listHeight) setListHeight(next);
    },
    [listHeight],
  );

  const headerNode = useMemo(
    () => getListHeaderNode(ListHeaderComponent),
    [ListHeaderComponent],
  );

  const renderEmptyComponent = useCallback(
    () => (
      <PortfolioEmptyState
        iconName="Clock"
        message={t('v2.emptystate.activity.copy')}
      />
    ),
    [t],
  );

  const headerComponent = useMemo(
    () => (
      <>
        {headerNode}
        {isEmpty ? renderEmptyComponent() : null}
      </>
    ),
    [headerNode, isEmpty, renderEmptyComponent],
  );

  const mergedContentContainerStyle = useMemo(() => {
    if (!footerSpacerHeight || activities.length > 2 || listHeight <= 0) {
      return containerStyle;
    }
    return [
      containerStyle,
      {
        minHeight: listHeight + footerSpacerHeight,
      },
    ];
  }, [containerStyle, footerSpacerHeight, activities.length, listHeight]);

  const renderFooter = useCallback(() => {
    if (
      hasLoadedOldestEntry ||
      !isLoadingOlderActivities ||
      activityListData.length === 0
    )
      return null;

    return (
      <View style={styles.loaderContainer}>
        <Loader testID="activity-list-loader" />
      </View>
    );
  }, [
    activityListData.length,
    hasLoadedOldestEntry,
    loadingIndicatorOffset,
    isLoadingOlderActivities,
    isEmpty,
  ]);

  const renderActivityItem = useCallback(
    ({ item }: { item: ActivityListItem }) => {
      if (item.type === 'dateTag') {
        return (
          <View style={styles.dateTagContainer}>
            <View style={styles.tag}>
              <CustomTag
                label={item.props.date}
                icon={
                  item.props.dateIcon ? (
                    <Icon
                      name={item.props.dateIcon}
                      size={16}
                      color={theme.text.primary}
                    />
                  ) : undefined
                }
                backgroundType="transparent"
                size="S"
              />
            </View>
          </View>
        );
      }

      const { rowKey: _rowKey, ...cardProps } = item.props;
      return (
        <ActivityCard {...cardProps} onActivityPress={handleActivityPress} />
      );
    },
    [handleActivityPress, theme.text.primary, styles],
  );

  useEffect(() => {
    if (!isVisible) return;
    if (activities.length === 0) {
      loadOlderActivities();
    }
  }, [activities.length, isVisible]);

  return (
    <Animated.FlatList
      ref={resolvedListRef as React.RefObject<FlatList>}
      testID="activity-list-container"
      data={activityListData}
      ListEmptyComponent={null}
      renderItem={renderActivityItem}
      onEndReached={onListEndReached}
      onEndReachedThreshold={0.2}
      keyExtractor={keyExtractor}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={headerComponent}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      style={style}
      contentContainerStyle={mergedContentContainerStyle}
      scrollEnabled={true}
      bounces={!isEmpty}
      overScrollMode={isAndroid && isEmpty ? 'never' : undefined}
      onLayout={onListLayout}
    />
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    dateTagContainer: {
      paddingHorizontal: spacing.S,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tag: {
      borderRadius: radius.M,
      backgroundColor: theme.background.secondary,
      borderWidth: 1,
      borderColor: theme.border.middle,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
    },
    loaderContainer: {
      marginTop: spacing.M,
      marginBottom: loadingIndicatorOffset,
      alignItems: 'center',
    },
  });

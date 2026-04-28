import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, radius, useTheme } from '../../../../design-tokens';
import { Text, CustomTag, Icon, Loader } from '../../../atoms';
import { ActivityCard } from '../../../molecules';
import { GenericFlashList } from '../../../organisms';

import type { ColorType } from '../../..';
import type { Theme } from '../../../../design-tokens';
import type { IconName } from '../../../atoms';
import type { ListRenderItemInfo } from '@shopify/flash-list';

type ActivityItem = {
  id: string;
  rowKey: string;
  title: string;
  subtitle: string;
  amount: string;
  coin: string;
  iconName: IconName;
  iconBackground: ColorType;
};

export type ActivitySection = {
  date: string;
  dateIcon?: IconName;
  items: ActivityItem[];
};

type DateTagEntry = { type: 'dateTag'; date: string; dateIcon?: IconName };
type ActivityEntry = { type: 'activity'; item: ActivityItem };
type ListEntry = ActivityEntry | DateTagEntry;

export type ActivityHistoryProps = {
  activitySections: ActivitySection[];
  onActivityPress?: (id: string) => void;
  isLoadingActivities?: boolean;
  /** Content rendered above the activity list (pool header, stats, epochs). */
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  /**
   * Inject a custom scroll component for bottom-sheet integration (native)
   * or leave undefined to use the default ScrollView (web).
   */
  renderScrollComponent?:
    | ((props: ScrollViewProps) => React.ReactElement)
    | undefined;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const keyExtractor = (entry: ListEntry, index: number) =>
  entry.type === 'dateTag'
    ? `date-${entry.date}`
    : entry.item.rowKey || `${index}`;

const getItemType = (entry: ListEntry) => entry.type;

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({
  activitySections,
  onActivityPress,
  isLoadingActivities = false,
  ListHeaderComponent,
  renderScrollComponent,
  contentContainerStyle,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const dateTagStyle = useMemo(() => getDateTagStyle(theme), [theme]);

  const data = useMemo(
    () =>
      activitySections.reduce<ListEntry[]>((accumulator, section) => {
        accumulator.push({
          type: 'dateTag',
          date: section.date,
          dateIcon: section.dateIcon,
        });
        for (const item of section.items) {
          accumulator.push({ type: 'activity', item });
        }
        return accumulator;
      }, []),
    [activitySections],
  );

  const renderItem = useCallback(
    ({ item: entry }: ListRenderItemInfo<ListEntry>) => {
      if (entry.type === 'dateTag') {
        return (
          <View style={styles.dateTagContainer}>
            <View style={dateTagStyle}>
              <CustomTag
                label={entry.date}
                icon={
                  entry.dateIcon ? (
                    <Icon
                      name={entry.dateIcon}
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
      const activity = entry.item;
      return (
        <ActivityCard
          id={activity.id}
          status="sent"
          info={{
            title: activity.title,
            subtitle: activity.subtitle,
          }}
          value={{
            title: {
              amount: activity.amount,
              label: activity.coin,
            },
          }}
          iconName={activity.iconName}
          iconBackground={activity.iconBackground}
          onActivityPress={onActivityPress}
        />
      );
    },
    [onActivityPress, dateTagStyle, theme],
  );

  const ActivityListHeader = useMemo(
    () => (
      <>
        {ListHeaderComponent &&
          (React.isValidElement(ListHeaderComponent) ? (
            ListHeaderComponent
          ) : (
            <ListHeaderComponent />
          ))}
        {(data.length > 0 || isLoadingActivities) && (
          <View
            testID="regular-pool-sheet-activity-history"
            style={styles.activityTitleContainer}>
            <Text.M variant="primary">{t('v2.regular-pool.activity')}</Text.M>
          </View>
        )}
      </>
    ),
    [ListHeaderComponent, data.length, isLoadingActivities, t],
  );

  const ActivityListFooter = useMemo(
    () =>
      isLoadingActivities ? (
        <View style={styles.loaderContainer}>
          <Loader testID="activity-list-loader" />
        </View>
      ) : null,
    [isLoadingActivities],
  );

  return (
    <GenericFlashList<ListEntry>
      testID="regular-pool-sheet-activity-list"
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ActivityListHeader}
      ListFooterComponent={ActivityListFooter}
      renderScrollComponent={renderScrollComponent}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={contentContainerStyle}
    />
  );
};

const getDateTagStyle = (theme: Theme) =>
  StyleSheet.create({
    tag: {
      borderRadius: radius.M,
      backgroundColor: theme.background.secondary,
      gap: spacing.XS,
      padding: spacing.S,
      borderWidth: 1,
      borderColor: theme.border.middle,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
    },
  }).tag;

const styles = StyleSheet.create({
  activityTitleContainer: {
    width: '100%',
    marginTop: spacing.M,
    paddingHorizontal: spacing.S,
  },
  dateTagContainer: {
    marginVertical: spacing.S,
    paddingHorizontal: spacing.S,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    marginVertical: spacing.M,
    paddingHorizontal: spacing.S,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

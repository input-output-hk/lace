import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Column, CustomTag, Icon, Loader } from '../../atoms';
import { ActivityCard } from '../../molecules';
import { GenericFlashList } from '../genericFlashList';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';
import type { ActivityCardProps } from '../../molecules';
import type { GenericFlashListProps } from '../genericFlashList';
import type { ListRenderItemInfo } from '@shopify/flash-list';

/** Stable list identity: same tx can have multiple activities (e.g. registration + delegation). */
export type FormattedActivityListItem = ActivityCardProps & {
  rowKey: string;
};

export type ActivitySection = {
  date: string;
  items: FormattedActivityListItem[];
  dateIcon?: IconName;
};

type DateTagProps = {
  date: string;
  dateIcon?: IconName;
};

export type ActivityCardType =
  | { type: 'activity'; props: FormattedActivityListItem }
  | { type: 'dateTag'; props: DateTagProps };

type ActivityListProps = Omit<
  GenericFlashListProps<ActivityCardType>,
  'data' | 'estimatedItemSize' | 'getItemType' | 'renderItem'
> & {
  sections: ActivitySection[];
  onActivityPress: (id: string) => void;
  onStartReachedThreshold?: number;
  isLoadingOlderActivities?: boolean;
};

export const ActivityList: React.FC<ActivityListProps> = ({
  sections,
  onActivityPress,
  isLoadingOlderActivities,
  ...props
}) => {
  const { theme } = useTheme();
  const dateTagStyle = useMemo(() => getDateTagStyle(theme), [theme]);
  const data = useMemo(
    () =>
      sections.reduce<ActivityCardType[]>((accumulator, section) => {
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
      }, []),
    [sections],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ActivityCardType>) => {
      if (item.type === 'dateTag') {
        return (
          <View style={styles.dateTagContainer}>
            <View style={dateTagStyle}>
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
      return <ActivityCard {...cardProps} onActivityPress={onActivityPress} />;
    },
    [onActivityPress, dateTagStyle, theme],
  );

  const ListFooterComponent = useCallback(() => {
    return isLoadingOlderActivities ? (
      <Column
        style={styles.loaderContainer}
        alignItems="center"
        gap={spacing.M}
        justifyContent="center">
        <Loader testID="activity-list-loader" color={theme.icons.background} />
      </Column>
    ) : null;
  }, [isLoadingOlderActivities, theme]);

  const getItemType = useCallback((item: ActivityCardType) => item.type, []);

  return (
    <GenericFlashList
      testID="activity-list"
      data={data}
      renderItem={renderItem}
      getItemType={getItemType}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={ListFooterComponent}
      {...props}
    />
  );
};

const getDateTagStyle = (theme: Theme) =>
  StyleSheet.create({
    tag: {
      borderRadius: radius.M,
      backgroundColor: theme.background.secondary,
      borderWidth: 1,
      borderColor: theme.border.middle,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
    },
  }).tag;

const styles = StyleSheet.create({
  dateTagContainer: {
    marginVertical: spacing.S,
    paddingHorizontal: spacing.S,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    marginTop: spacing.M,
    marginBottom: spacing.M,
  },
});

import type { ImageSourcePropType } from 'react-native';

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../design-tokens';
import { Column, Icon, SettingsCard } from '../atoms';
import { PageHeaderSection } from '../molecules';
import { GenericFlashList } from '../organisms';
import { usePageHeaderCollapseScroll } from '../util';

import { PageContainerTemplate } from './pageContainerTemplate/pageContainerTemplate';

import type { IconName } from '../atoms';

type ListOptionType = {
  id: string;
  titleKey: string;
  subtitleKey?: string;
  icon: IconName;
  onPress: () => void;
};

interface OptionListProps {
  colors: readonly string[];
  options: ListOptionType[];
  title: string;
  subtitle: string;
  backgroundImage?: ImageSourcePropType;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onBackPress?: () => void;
  onClosePress?: () => void;
  isTablet?: boolean;
}

export const OptionList = ({
  options,
  title,
  subtitle,
  backgroundImage,
  showSearch = false,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onBackPress,
  onClosePress,
  isTablet,
}: OptionListProps) => {
  const { theme } = useTheme();
  const { collapseScrollY, onScroll } = usePageHeaderCollapseScroll();

  const headerSection = useMemo(
    () => (
      <PageHeaderSection
        isTablet={isTablet}
        title={title}
        subtitle={subtitle}
        backgroundImage={backgroundImage}
        showSearch={showSearch || isTablet}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        onBackPress={onBackPress}
        onClosePress={onClosePress}
        testID="option-list-header-section"
        pageHeaderTestID="option-list-page-header"
        collapseScrollY={collapseScrollY}></PageHeaderSection>
    ),
    [
      title,
      subtitle,
      backgroundImage,
      onBackPress,
      onClosePress,
      isTablet,
      collapseScrollY,
      searchValue,
      onSearchChange,
      searchPlaceholder,
      showSearch,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListOptionType }) => {
      const { titleKey, subtitleKey, icon, onPress } = item;

      return (
        <Column
          style={styles.cardContainer}
          alignItems="center"
          gap={spacing.M}>
          <SettingsCard
            iconWrapperStyle={{}}
            title={titleKey}
            description={subtitleKey}
            iconName={icon}
            rightNode={
              <Icon name="CaretRight" size={20} color={theme.text.primary} />
            }
            quickActions={{
              onCardPress: onPress,
            }}
            testID={`option-list-item-${item.id}`}
          />
        </Column>
      );
    },
    [theme.text.primary],
  );

  return (
    <PageContainerTemplate>
      <View style={styles.fillSpace}>
        {headerSection}
        <GenericFlashList
          style={styles.fillSpace}
          data={options}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      </View>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  fillSpace: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.XXXXL,
  },
  itemSeparator: {
    height: spacing.S,
  },
  cardContainer: {
    width: '100%',
  },
});

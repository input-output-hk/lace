import type { ImageSourcePropType } from 'react-native';

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { SearchBar, type SearchBarAction } from '..';
import { radius, spacing, useTheme } from '../../../design-tokens';
import { Text, Column, Row, Icon, Button } from '../../atoms';
import { IconButton } from '../../atoms/iconButton/iconButton';
import { isWeb } from '../../util';

import type { Theme } from '../../../design-tokens';

const COLLAPSE_SCROLL_RANGE = 72;

const BACKGROUND_HEIGHT_WEB = {
  WITH_SUBTITLE: 200,
  WITHOUT_SUBTITLE: 168,
};
const BACKGROUND_HEIGHT_NATIVE = {
  WITH_SUBTITLE: 120,
  WITHOUT_SUBTITLE: 88,
};

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backgroundImage?: ImageSourcePropType;
  reserveSubtitleSpace?: boolean;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onBackPress?: () => void;
  onClosePress?: () => void;
  testID?: string;
  isTablet?: boolean;
  isDark?: boolean;
  compact?: boolean;
  searchBarActions?: SearchBarAction[];
  collapseScrollYProp?: SharedValue<number>;
  stickyInScrollParent?: boolean;
}

export const PageHeader = ({
  title,
  subtitle,
  showSearch = false,
  reserveSubtitleSpace = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  onBackPress,
  onClosePress,
  testID = 'page-header',
  compact = false,
  searchBarActions,
  collapseScrollYProp,
  stickyInScrollParent = false,
}: PageHeaderProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const hasSubtitleSpace = Boolean(subtitle) || reserveSubtitleSpace;
  const fallbackScrollY = useSharedValue(0);
  const collapseScrollY = collapseScrollYProp ?? fallbackScrollY;

  const backgroundHeightWeb = hasSubtitleSpace
    ? BACKGROUND_HEIGHT_WEB.WITH_SUBTITLE
    : BACKGROUND_HEIGHT_WEB.WITHOUT_SUBTITLE;

  const backgroundHeightMobile = hasSubtitleSpace
    ? BACKGROUND_HEIGHT_NATIVE.WITH_SUBTITLE
    : BACKGROUND_HEIGHT_NATIVE.WITHOUT_SUBTITLE;

  const fullBackground = isWeb ? backgroundHeightWeb : backgroundHeightMobile;
  const collapsedBackground = fullBackground * 0.62;

  const collapseProgress = useDerivedValue(() =>
    interpolate(
      collapseScrollY.value,
      [0, COLLAPSE_SCROLL_RANGE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  );

  const compactBgAnimated = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      paddingVertical: interpolate(
        progress,
        [0, 1],
        [spacing.M, spacing.S],
        Extrapolation.CLAMP,
      ),
    };
  }, [collapseProgress]);

  const compactTitleScaleStyle = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      transform: [
        {
          scale: interpolate(progress, [0, 1], [1, 0.92], Extrapolation.CLAMP),
        },
      ],
    };
  }, [collapseProgress]);

  const compactSearchMarginStyle = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      marginTop: interpolate(
        progress,
        [0, 1],
        [spacing.M, spacing.S],
        Extrapolation.CLAMP,
      ),
    };
  }, [collapseProgress]);

  const headerBgAnimated = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      height: interpolate(
        progress,
        [0, 1],
        [fullBackground, collapsedBackground],
        Extrapolation.CLAMP,
      ),
    };
  }, [collapseProgress, fullBackground, collapsedBackground]);

  const overlayAnimated = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    const padY = interpolate(
      progress,
      [0, 1],
      [spacing.L, spacing.S],
      Extrapolation.CLAMP,
    );
    const gapY = interpolate(
      progress,
      [0, 1],
      [spacing.L, spacing.XS],
      Extrapolation.CLAMP,
    );
    return {
      paddingTop: padY,
      paddingBottom: showSearch
        ? interpolate(
            progress,
            [0, 1],
            [spacing.S, spacing.XS],
            Extrapolation.CLAMP,
          )
        : padY,
      gap: gapY,
    };
  }, [collapseProgress, showSearch]);

  const controlsAnimated = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      top: interpolate(
        progress,
        [0, 1],
        [spacing.L, spacing.S],
        Extrapolation.CLAMP,
      ),
    };
  }, [collapseProgress]);

  const titleScaleStyle = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      transform: [
        {
          scale: interpolate(progress, [0, 1], [1, 0.9], Extrapolation.CLAMP),
        },
      ],
    };
  }, [collapseProgress]);

  const wrapSticky = (node: React.ReactElement) =>
    stickyInScrollParent ? (
      <Animated.View style={styles.stickyWrapper}>{node}</Animated.View>
    ) : (
      node
    );

  if (compact) {
    return wrapSticky(
      <Animated.View
        style={[styles.compactContainer, compactBgAnimated]}
        testID={testID}>
        <Row style={styles.compactHeaderRow}>
          {onBackPress && (
            <Button.Secondary
              preIconName="CaretLeft"
              size="small"
              onPress={onBackPress}
              testID={`${testID}-back-button`}
            />
          )}
          <Animated.View
            style={[styles.compactTextContainer, compactTitleScaleStyle]}>
            <Column style={styles.compactTextInner}>
              <Text.M numberOfLines={2} testID={`${testID}-title`}>
                {title}
              </Text.M>
              {!!subtitle && (
                <Text.XS testID={`${testID}-subtitle`}>{subtitle}</Text.XS>
              )}
            </Column>
          </Animated.View>
          {onClosePress && (
            <Button.Secondary
              preIconName="Cancel"
              size="small"
              onPress={onClosePress}
              testID={`${testID}-close-button`}
            />
          )}
        </Row>
        {showSearch && (
          <Animated.View
            style={[styles.compactSearchContainer, compactSearchMarginStyle]}>
            <SearchBar
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              testID={`${testID}-search`}
              extraStyle={styles.searchBar}
              actions={searchBarActions}
            />
          </Animated.View>
        )}
      </Animated.View>,
    );
  }

  const renderBackground = () => (
    <Animated.View
      style={[
        styles.headerBackground,
        !hasSubtitleSpace ? styles.headerBackgroundWithoutSubtitle : undefined,
        headerBgAnimated,
      ]}
    />
  );

  return wrapSticky(
    <View style={styles.headerContainer} testID={testID}>
      {renderBackground()}
      <Animated.View
        style={[
          styles.overlay,
          !hasSubtitleSpace ? styles.overlayWithoutSubtitle : undefined,
          showSearch ? styles.overlayWithSearch : undefined,
          overlayAnimated,
        ]}>
        <Animated.View style={[styles.controlsRow, controlsAnimated]}>
          {onBackPress ? (
            <IconButton.Static
              icon={<Icon name="CaretLeft" />}
              onPress={onBackPress}
              testID={`${testID}-back-button`}
              containerStyle={styles.iconButton}
            />
          ) : (
            <View style={styles.iconButtonPlaceholder} />
          )}
          {onClosePress ? (
            <IconButton.Static
              icon={<Icon name="Cancel" />}
              onPress={onClosePress}
              testID={`${testID}-close-button`}
              containerStyle={styles.iconButton}
            />
          ) : (
            <View style={styles.iconButtonPlaceholder} />
          )}
        </Animated.View>
        <View
          style={[
            styles.headerContentWrapper,
            showSearch ? styles.headerContentWrapperWithSearch : undefined,
          ]}>
          <Column
            style={[
              styles.headerContent,
              !subtitle ? styles.headerContentWithoutSubtitle : undefined,
            ]}>
            <Animated.View style={titleScaleStyle}>
              <Text.L testID={`${testID}-title`}>{title}</Text.L>
            </Animated.View>
            {!!subtitle && (
              <Text.M align="center" testID={`${testID}-subtitle`}>
                {subtitle}
              </Text.M>
            )}
          </Column>
        </View>
        {showSearch && (
          <Row style={styles.searchBarContainer}>
            <SearchBar
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              testID={`${testID}-search`}
              extraStyle={styles.searchBar}
              actions={searchBarActions}
            />
          </Row>
        )}
      </Animated.View>
    </View>,
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    stickyWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      backgroundColor: theme.background.page,
    },
    headerContainer: {
      position: 'relative',
      overflow: 'hidden',
    },
    compactContainer: {
      position: 'relative',
      gap: spacing.M,
    },
    compactHeaderRow: {
      alignItems: 'center',
      gap: spacing.XS,
    },
    compactTextContainer: {
      flex: 1,
      paddingStart: spacing.S,
    },
    compactTextInner: {
      alignItems: 'flex-start',
    },
    compactSearchContainer: {
      width: '100%',
    },
    headerBackground: {
      width: '100%',
      height: isWeb ? 200 : 120,
    },
    headerBackgroundWithoutSubtitle: {
      height: isWeb ? 168 : 88,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: spacing.L,
      paddingBottom: spacing.L,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.L,
    },
    overlayWithoutSubtitle: {
      paddingVertical: spacing.S,
    },
    overlayWithSearch: {
      paddingBottom: spacing.S,
      gap: spacing.S,
    },
    headerContentWrapper: {
      width: '100%',
      alignItems: 'center',
    },
    headerContentWrapperWithSearch: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContent: {
      alignItems: 'center',
      gap: spacing.XS,
    },
    headerContentWithoutSubtitle: {
      paddingBottom: 0,
    },
    searchBarContainer: {
      width: '100%',
      alignSelf: 'stretch',
    },
    searchBar: {
      flex: 1,
    },
    controlsRow: {
      position: 'absolute',
      top: spacing.L,
      left: spacing.L,
      right: spacing.L,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    iconButton: {
      backgroundColor: theme.background.secondary,
      borderRadius: radius.rounded,
    },
    iconButtonPlaceholder: {
      width: 40,
      height: 40,
    },
  });

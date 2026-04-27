import type { StyleProp, ViewStyle } from 'react-native';

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { spacing, useTheme } from '../../../design-tokens';
import { PageHeader, type PageHeaderProps } from '../pageHeader/pageHeader';

import type { Theme } from '../../../design-tokens';

type PageHeaderSectionProps = Omit<PageHeaderProps, 'stickyInScrollParent'> & {
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  pageHeaderTestID?: string;
  collapseScrollY?: SharedValue<number>;
  stickyInScrollParent?: boolean;
};

export const PageHeaderSection = ({
  children,
  contentStyle,
  pageHeaderTestID,
  collapseScrollY,
  stickyInScrollParent = false,
  testID = 'page-header-section',
  ...pageHeaderProps
}: PageHeaderSectionProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const content = (
    <View style={styles.content}>
      <PageHeader
        {...pageHeaderProps}
        collapseScrollYProp={collapseScrollY}
        testID={pageHeaderTestID ?? `${testID}-page-header`}
      />
      {children && (
        <View style={[styles.container, contentStyle]}>{children}</View>
      )}
    </View>
  );

  return (
    <View testID={testID}>
      {stickyInScrollParent ? (
        <Animated.View style={styles.stickyWrapper}>{content}</Animated.View>
      ) : (
        content
      )}
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.S,
    },
    stickyWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      backgroundColor: theme.background.primary,
    },
    container: {
      paddingBottom: spacing.L,
    },
  });

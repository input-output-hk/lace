import type { StyleProp, ViewStyle } from 'react-native';

import React, { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { PAGE_HEADER_COLLAPSE_SCROLL_RANGE } from '../..';
import { spacing } from '../../../design-tokens';
import {
  getPageHeaderBackgroundHeights,
  PageHeader,
  type PageHeaderProps,
} from '../pageHeader/pageHeader';

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
  const hasCollapsibleContent = !!children;
  const hasSubtitleSpace =
    Boolean(pageHeaderProps.subtitle) ||
    Boolean(pageHeaderProps.reserveSubtitleSpace);
  const { fullBackground, collapsedBackground } =
    getPageHeaderBackgroundHeights(hasSubtitleSpace);
  const childPullUpDistance = fullBackground - collapsedBackground;
  const [stickyMeasuredHeight, setStickyMeasuredHeight] = useState<
    number | null
  >(null);

  const handleStickyLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    // Ignore zero/invalid measurements: React Navigation can lay the screen
    // out while it is still hidden/transitioning (e.g. tapping the tab right
    // after a network switch), reporting height 0. Locking that value would
    // collapse the sticky header to 0 with no re-measure path, leaving the
    // page without a header. Keep measuring until a real height arrives.
    if (nextHeight <= 0) return;
    setStickyMeasuredHeight(currentHeight =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    );
  }, []);

  const contentAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY:
            stickyInScrollParent && hasCollapsibleContent && collapseScrollY
              ? interpolate(
                  collapseScrollY.value,
                  [0, PAGE_HEADER_COLLAPSE_SCROLL_RANGE],
                  [0, -childPullUpDistance],
                  Extrapolation.CLAMP,
                )
              : 0,
        },
      ],
    }),
    [
      childPullUpDistance,
      collapseScrollY,
      hasCollapsibleContent,
      stickyInScrollParent,
    ],
  );

  const stickyHeightAnimatedStyle = useAnimatedStyle(
    () => ({
      height:
        stickyInScrollParent &&
        hasCollapsibleContent &&
        collapseScrollY &&
        stickyMeasuredHeight !== null
          ? interpolate(
              collapseScrollY.value,
              [0, PAGE_HEADER_COLLAPSE_SCROLL_RANGE],
              [
                stickyMeasuredHeight,
                stickyMeasuredHeight - childPullUpDistance,
              ],
              Extrapolation.CLAMP,
            )
          : stickyMeasuredHeight ?? undefined,
    }),
    [
      childPullUpDistance,
      collapseScrollY,
      hasCollapsibleContent,
      stickyInScrollParent,
      stickyMeasuredHeight,
    ],
  );

  const content = (
    <View style={styles.content}>
      <PageHeader
        {...pageHeaderProps}
        collapseScrollYProp={collapseScrollY}
        stableCollapseLayout={stickyInScrollParent}
        testID={pageHeaderTestID ?? `${testID}-page-header`}
      />
      {children && (
        <Animated.View
          style={[styles.container, contentStyle, contentAnimatedStyle]}>
          {children}
        </Animated.View>
      )}
    </View>
  );

  return (
    <View testID={testID}>
      {stickyInScrollParent ? (
        stickyMeasuredHeight === null ? (
          <View onLayout={handleStickyLayout}>{content}</View>
        ) : (
          <>
            <Animated.View style={stickyHeightAnimatedStyle} />
            <Animated.View
              style={[styles.stickyWrapper, stickyHeightAnimatedStyle]}>
              {content}
            </Animated.View>
          </>
        )
      ) : (
        content
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.S,
  },
  stickyWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    overflow: 'hidden',
  },
  container: {
    paddingBottom: spacing.M,
  },
});

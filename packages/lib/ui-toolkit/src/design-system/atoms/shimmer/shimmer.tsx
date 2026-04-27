import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme, spacing } from '../../../design-tokens';
import {
  getLeftGapOnSideMenu,
  getMinContentPortfolioWidth,
  isExtensionSidePanel,
} from '../../util';
import { Column } from '../column/column';
import { Row } from '../row/row';

const clamp0 = (value: number) => Math.max(0, value);

interface ShimmerProps {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  backgroundColor?: string;
}

const lineHeights = {
  xxs: 18,
  xs: 20,
  s: 22,
  m: 26,
  l: 31,
  xl: 41,
  header: 55,
  'page-header': 62,
} as const;

// Predefined width patterns for common use cases
const widthPatterns = {
  xxs: {
    short: 40,
    medium: 60,
    long: 80,
  },
  xs: {
    short: 50,
    medium: 70,
    long: 90,
  },
  s: {
    short: 60,
    medium: 80,
    long: 100,
  },
  m: {
    short: 60,
    medium: 80,
    long: 100,
  },
  l: {
    short: 80,
    medium: 120,
    long: 150,
  },
  xl: {
    short: 100,
    medium: 150,
    long: 200,
  },
  header: {
    short: 150,
    medium: 200,
    long: 250,
  },
  'page-header': {
    short: 180,
    medium: 250,
    long: 300,
  },
} as const;

type ShimmerSize = keyof typeof lineHeights;
type WidthVariant = 'long' | 'medium' | 'short';

interface TypographyShimmerProps
  extends Omit<ShimmerProps, 'height' | 'width'> {
  size: ShimmerSize;
  width?: WidthVariant | number;
}

// Helper function to resolve width
const resolveWidth = (
  size: ShimmerSize,
  width?: WidthVariant | number,
): number => {
  if (typeof width === 'number') return width;
  if (typeof width === 'string') return widthPatterns[size][width];
  return widthPatterns[size].medium; // default to medium
};

const BaseShimmer = ({
  width,
  height,
  style,
  borderRadius = 4,
  backgroundColor,
}: ShimmerProps) => {
  const { theme } = useTheme();
  const shimmerWidth = width || 100;
  const translateX = useSharedValue(-shimmerWidth);

  const startAnimation = useCallback(() => {
    translateX.value = withRepeat(
      withTiming(shimmerWidth, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [shimmerWidth, translateX]);

  React.useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: translateX.value }],
    }),
    [translateX],
  );

  const containerStyle = useMemo(
    () => [
      {
        width,
        height,
        backgroundColor: backgroundColor || theme.background.tertiary,
        borderRadius,
        overflow: 'hidden' as const,
        marginBottom: spacing.XS,
      },
      style,
    ],
    [
      width,
      height,
      backgroundColor,
      theme.background.tertiary,
      borderRadius,
      style,
    ],
  );

  const animatedViewStyle = useMemo(
    () => [{ flex: 1 }, animatedStyle],
    [animatedStyle],
  );

  const gradientStyle = useMemo(
    () => ({
      flex: 1,
      width: shimmerWidth * 2,
    }),
    [shimmerWidth],
  );

  return (
    <View style={containerStyle}>
      <Animated.View style={animatedViewStyle}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={gradientStyle}
        />
      </Animated.View>
    </View>
  );
};

// Typography-based shimmer components with memoization
const XXS = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('xxs', props.width)}
    height={lineHeights.xxs}
  />
));

const XS = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('xs', props.width)}
    height={lineHeights.xs}
  />
));

const S = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('s', props.width)}
    height={lineHeights.s}
  />
));

const M = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('m', props.width)}
    height={lineHeights.m}
  />
));

const L = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('l', props.width)}
    height={lineHeights.l}
  />
));

const XL = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('xl', props.width)}
    height={lineHeights.xl}
  />
));

const Header = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('header', props.width)}
    height={lineHeights.header}
  />
));

const PageHeader = React.memo((props: Omit<TypographyShimmerProps, 'size'>) => (
  <BaseShimmer
    {...props}
    width={resolveWidth('page-header', props.width)}
    height={lineHeights['page-header']}
  />
));

// Export both the base component and typography-based variants
export const Shimmer = Object.assign(BaseShimmer, {
  XXS,
  XS,
  S,
  M,
  L,
  XL,
  Header,
  PageHeader,
});

const SHIMMER_STAGES = {
  SHORT: [1, 2, 3],
  MEDIUM: [1, 2, 3, 4],
  LONG: [0, 1, 2, 3, 4, 5],
} as const;

export const PortfolioSkeleton = () => {
  const { isSideMenu } = useTheme();
  const skeletonStyles = getStyles({ isSideMenu });

  return (
    <ScrollView
      contentContainerStyle={skeletonStyles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <Column gap={spacing.L}>
        <Shimmer.Header width="medium" />
        <Shimmer.L width="short" />

        <Shimmer width={300} height={120} borderRadius={8} />

        <Row justifyContent="center" gap={spacing.S}>
          {SHIMMER_STAGES.MEDIUM.map(index => (
            <Shimmer key={index} width={50} height={32} borderRadius={16} />
          ))}
        </Row>

        <Row justifyContent="space-around" gap={spacing.L}>
          {SHIMMER_STAGES.MEDIUM.map(index => (
            <Shimmer key={index} width={70} height={40} borderRadius={8} />
          ))}
        </Row>

        <Row gap={spacing.S}>
          {SHIMMER_STAGES.SHORT.map(index => (
            <Shimmer key={index} width={80} height={40} borderRadius={8} />
          ))}
        </Row>

        <Column gap={spacing.M}>
          {SHIMMER_STAGES.LONG.map(index => (
            <Row key={index} alignItems="center" gap={spacing.M}>
              <Shimmer width={48} height={48} borderRadius={24} />
              <Column gap={spacing.XS} style={skeletonStyles.listItemContent}>
                <Shimmer.M width="medium" />
                <Shimmer.S width="short" />
                <Shimmer.XS width="long" />
              </Column>
              <Column gap={spacing.XS}>
                <Shimmer.M width="short" />
                <Shimmer.XS width="short" />
              </Column>
            </Row>
          ))}
        </Column>
      </Column>
    </ScrollView>
  );
};

export const CompactPortfolioSkeleton = () => {
  const { isSideMenu } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const {
    shouldCenterForExtensionTab,
    outerContentWidth,
    cardWidth,
    assetRowWidth,
    halfWidth,
  } = useMemo(() => {
    const availableWidth = clamp0(
      windowWidth - getLeftGapOnSideMenu(isSideMenu),
    );
    const shouldCenterForExtensionTab = isExtensionSidePanel;

    const outerContentWidth = shouldCenterForExtensionTab
      ? clamp0(getMinContentPortfolioWidth(availableWidth))
      : availableWidth;

    const innerWidth = clamp0(outerContentWidth - spacing.M * 2);

    return {
      shouldCenterForExtensionTab,
      outerContentWidth,
      cardWidth: innerWidth,
      assetRowWidth: clamp0(innerWidth - 40 - spacing.M),
      halfWidth: clamp0((innerWidth - spacing.S) / 2),
    };
  }, [isSideMenu, windowWidth]);

  const styles = useMemo(
    () =>
      compactPortfolioStyles({
        isSideMenu,
        outerContentWidth,
      }),
    [isSideMenu, outerContentWidth],
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        shouldCenterForExtensionTab && styles.centeredContent,
      ]}
      showsVerticalScrollIndicator={false}>
      <Column gap={spacing.M}>
        <Column
          style={[
            styles.carouselCardContainer,
            shouldCenterForExtensionTab && styles.outerContent,
          ]}>
          <Shimmer width={cardWidth} height={115} borderRadius={15} />
        </Column>

        <Column
          style={[
            styles.tabsAndPagination,
            shouldCenterForExtensionTab && styles.outerContent,
          ]}
          gap={spacing.M}>
          <Row justifyContent="space-between" gap={spacing.S}>
            <Shimmer width={25} height={25} borderRadius={15} />
            <Row justifyContent="center" gap={spacing.S}>
              {SHIMMER_STAGES.SHORT.map(index => (
                <Shimmer key={index} width={15} height={15} borderRadius={10} />
              ))}
            </Row>
            <Shimmer width={25} height={25} borderRadius={15} />
          </Row>
          <Row gap={spacing.S} justifyContent="center">
            <Shimmer width={halfWidth} height={35} borderRadius={16} />
            <Shimmer width={halfWidth} height={35} borderRadius={16} />
          </Row>
        </Column>

        <Column
          style={[
            styles.assetListContainer,
            shouldCenterForExtensionTab && styles.outerContent,
          ]}
          gap={spacing.S}>
          {SHIMMER_STAGES.LONG.map(index => (
            <Row key={index} alignItems="center" gap={spacing.M}>
              <Shimmer width={40} height={40} borderRadius={20} />
              <Column gap={spacing.XS}>
                <Shimmer width={assetRowWidth} height={60} borderRadius={16} />
              </Column>
            </Row>
          ))}
        </Column>
      </Column>
    </ScrollView>
  );
};

const getStyles = ({ isSideMenu }: { isSideMenu: boolean }) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: spacing.XL,
      marginLeft: getLeftGapOnSideMenu(isSideMenu),
      paddingBottom: spacing.XXXXL,
    },
    listItemContent: {
      flex: 1,
    },
  });

const compactPortfolioStyles = ({
  isSideMenu,
  outerContentWidth,
}: {
  isSideMenu: boolean;
  outerContentWidth: number;
}) =>
  StyleSheet.create({
    scrollContent: {
      marginLeft: getLeftGapOnSideMenu(isSideMenu),
      paddingVertical: spacing.S,
    },
    centeredContent: {
      alignItems: 'center',
    },
    outerContent: {
      width: outerContentWidth,
    },
    carouselCardContainer: {
      paddingHorizontal: spacing.M,
    },
    tabsAndPagination: {
      marginVertical: spacing.M,
      paddingHorizontal: spacing.M,
    },
    assetListContainer: {
      paddingHorizontal: spacing.M,
    },
  });

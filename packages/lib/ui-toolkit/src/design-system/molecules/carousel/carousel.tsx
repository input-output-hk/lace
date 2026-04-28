import type { LayoutChangeEvent } from 'react-native';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Directions,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { spacing } from '../../../design-tokens';
import { Column } from '../../atoms';
import { Pagination } from '../pagination/pagination';

import type { SharedValue } from 'react-native-reanimated';

type CarouselContextType = {
  scrollX: SharedValue<number>;
  totalSlides: number;
  containerWidth: number;
};

const CarouselContext = createContext<CarouselContextType | undefined>(
  undefined,
);

type CarouselRootProps = {
  children: React.ReactNode;
  activeIndex: number;
  onIndexChange?: (index: number) => void;
  onContainerMeasured?: () => void;
  pagination?: {
    enabled: boolean;
    withButtons?: boolean;
    loop?: boolean;
    showPortfolioView?: boolean;
  };
  testID?: string;
};

const Root = ({
  children,
  activeIndex = 0,
  onIndexChange,
  onContainerMeasured,
  pagination,
  testID,
}: CarouselRootProps) => {
  const scrollX = useSharedValue(0);
  const slidesArray = React.Children.toArray(children);
  const totalSlides = slidesArray.length;

  const [containerWidth, setContainerWidth] = useState<number>(0);

  const setActiveIndex = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, totalSlides - 1));
    onIndexChange?.(clampedIndex);
  };

  const animateToIndex = (index: number, width: number) => {
    const clampedIndex = Math.max(0, Math.min(index, totalSlides - 1));
    scrollX.value = withSpring(clampedIndex * width, {
      damping: 15,
      stiffness: 100,
    });
  };

  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      if (activeIndex < slidesArray.length - 1)
        runOnJS(setActiveIndex)(activeIndex + 1);
    });

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      if (activeIndex > 0) runOnJS(setActiveIndex)(activeIndex - 1);
    });

  const gesture = Gesture.Simultaneous(flingLeft, flingRight);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && containerWidth === 0) {
      // First measurement - notify parent
      onContainerMeasured?.();
    }
    setContainerWidth(width);
  };

  // Only animate when we have a valid containerWidth (web-safe)
  useEffect(() => {
    if (containerWidth > 0) {
      animateToIndex(activeIndex, containerWidth);
    }
  }, [activeIndex, containerWidth]);

  const containerAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: -scrollX.value }],
    }),
    [scrollX],
  );

  return (
    <CarouselContext.Provider value={{ scrollX, totalSlides, containerWidth }}>
      <GestureDetector gesture={gesture}>
        <Column style={styles.column} onLayout={handleLayout} testID={testID}>
          <Animated.View
            style={[
              styles.container,
              { width: containerWidth * slidesArray.length },
              containerAnimatedStyle,
            ]}>
            {slidesArray}
          </Animated.View>
        </Column>
      </GestureDetector>
      {pagination?.enabled && (
        <View style={styles.paginationContainer}>
          <Pagination
            pages={totalSlides}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            withNavigation={pagination.withButtons}
            loop={pagination.loop}
            showPortfolioView={pagination.showPortfolioView}
            testID={testID ? `${testID}-pagination` : 'carousel-pagination'}
          />
        </View>
      )}
    </CarouselContext.Provider>
  );
};

type CarouselSlideProps = {
  children: React.ReactNode;
  height?: number;
};
const Slide = ({ children, height }: CarouselSlideProps) => {
  const context = useContext(CarouselContext);
  if (!context)
    throw new Error('CarouselSlide must be used within a CarouselRoot');
  const { containerWidth } = context;

  return <View style={{ width: containerWidth, height }}>{children}</View>;
};

export const Carousel = {
  Root,
  Slide,
};

const styles = StyleSheet.create({
  column: {
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    rowGap: spacing.L,
    paddingRight: spacing.M,
  },
  paginationContainer: {
    marginTop: spacing.M,
  },
});

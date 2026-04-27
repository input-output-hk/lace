import type { LayoutChangeEvent } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  clamp,
} from 'react-native-reanimated';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';

type PricePillProps = {
  date: string;
  price: string;
  currency: string;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onDragUpdate?: (position: { x: number; y: number }) => void;
  dragBounds?: { width: number; height: number };
  isInteractive?: boolean;
};

export const PricePill = ({
  date,
  price,
  currency,
  onDragEnd,
  onDragUpdate,
  dragBounds,
  isInteractive = true,
}: PricePillProps): React.JSX.Element => {
  const { theme } = useTheme();
  const offset = useSharedValue({ x: 0, y: 0 });
  const start = useSharedValue({ x: 0, y: 0 });
  const pillSize = useSharedValue({ width: 0, height: 0 });

  const styles = useMemo(() => getStyles(theme), [theme]);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: offset.value.x,
      top: offset.value.y,
    };
  }, [offset.value]);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      start.value = {
        x: offset.value.x,
        y: offset.value.y,
      };
    })
    .onUpdate(event => {
      'worklet';
      let nextX = event.translationX + start.value.x;
      let nextY = event.translationY + start.value.y;
      if (dragBounds) {
        const minX = 0;
        const minY = 0;
        const maxX = dragBounds.width - pillSize.value.width;
        const maxY = dragBounds.height - pillSize.value.height;
        nextX = clamp(nextX, minX, maxX);
        nextY = clamp(nextY, minY, maxY);
      }
      offset.value = {
        x: nextX,
        y: nextY,
      };

      if (onDragUpdate) {
        runOnJS(onDragUpdate)(offset.value);
      }
    })
    .onEnd(() => {
      'worklet';
      if (onDragEnd) {
        runOnJS(onDragEnd)(offset.value);
      }
    })
    .enabled(isInteractive);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    pillSize.value = { width, height };
  };

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <Animated.View
          onLayout={onLayout}
          style={[styles.container, animatedStyles]}>
          <Text.S style={styles.text} numberOfLines={1}>
            {date} {price} {currency}
          </Text.S>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.S,
      borderRadius: radius.S,
      alignSelf: 'flex-start',
      backgroundColor: theme.background.primary,
    },
    text: {
      color: theme.text.primary,
      borderRadius: radius.S,
    },
  });

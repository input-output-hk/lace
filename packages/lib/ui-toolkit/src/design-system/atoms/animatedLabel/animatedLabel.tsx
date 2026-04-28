import type { TextStyle } from 'react-native';

import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { type Theme } from '../../../design-tokens';
import { isWeb } from '../../util';
import {
  LABEL_ANIMATION_OFFSET,
  LABEL_FOCUSED_POSITION,
  LABEL_FONT_SIZES,
} from '../customTextInput/constants';
import { Text } from '../text/text';

import type { SharedValue } from 'react-native-reanimated';

interface AnimatedLabelProps {
  label?: string;
  animatedLabel: boolean;
  labelAnim: SharedValue<number>;
  containerHeight: number;
  theme: Theme;
  isLarge?: boolean;
  styleOverrides?: Partial<AnimatedLabelStyles>;
  testID?: string;
}

export interface AnimatedLabelStyles {
  label: TextStyle;
  staticLabel: TextStyle;
}

export const AnimatedLabel = ({
  label,
  animatedLabel,
  labelAnim,
  containerHeight,
  theme,
  isLarge = false,
  styleOverrides,
  testID,
}: AnimatedLabelProps) => {
  if (!label) return null;

  const styles = getStyles(theme, styleOverrides);

  if (!animatedLabel)
    return (
      <Text.XS variant="secondary" style={styles.staticLabel} testID={testID}>
        {label}
      </Text.XS>
    );

  const initialPosition = !isLarge
    ? [containerHeight / 2 - LABEL_ANIMATION_OFFSET, LABEL_FOCUSED_POSITION]
    : [LABEL_ANIMATION_OFFSET, LABEL_FOCUSED_POSITION];

  const animatedStyle = useAnimatedStyle(
    () => ({
      top: interpolate(
        labelAnim.value,
        [0, 1],
        initialPosition,
        Extrapolation.CLAMP,
      ),
      fontSize: interpolate(
        labelAnim.value,
        [0, 1],
        [LABEL_FONT_SIZES.UNFOCUSED, LABEL_FONT_SIZES.FOCUSED],
        Extrapolation.CLAMP,
      ),
      color: theme.text.secondary,
      position: 'absolute',
      left: 3,
      pointerEvents: 'none',
    }),
    [
      labelAnim.value,
      containerHeight,
      theme.text.tertiary,
      theme.text.secondary,
    ],
  );

  return (
    <Animated.Text style={[styles.label, animatedStyle]} testID={testID}>
      {label}
    </Animated.Text>
  );
};

const getStyles = (
  theme: Theme,
  styleOverrides?: Partial<AnimatedLabelStyles>,
) => {
  return StyleSheet.create({
    label: {
      color: theme.text.tertiary,
      fontFamily: 'ProximaNova-Medium',
      marginLeft: 5,
      ...(styleOverrides?.label ?? {}),
    },
    staticLabel: {
      top: !isWeb ? 15 : 0,
      left: 8,
      ...(styleOverrides?.staticLabel ?? {}),
    },
  });
};

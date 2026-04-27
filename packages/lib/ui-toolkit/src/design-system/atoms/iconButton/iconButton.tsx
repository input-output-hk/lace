import type { ViewStyle, TextStyle } from 'react-native';

import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { Text } from '../';
import { useTheme, radius, spacing } from '../../../design-tokens';

import type { Theme } from '../../../design-tokens';
import type { PressableProps } from 'react-native-gesture-handler';

export type IconButtonProps = Omit<PressableProps, 'style'> & {
  icon?: React.ReactElement;
  containerStyle?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  label?: {
    position: 'center' | 'left' | 'right';
    content: string;
  };
  duration?: number;
  rotateTo?: number;
  onPressAnimation?: () => void;
};

const Static = ({
  icon,
  containerStyle,
  textStyle,
  label,
  testID,
  disabled,
  ...restProps
}: IconButtonProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const labelStyleMap = useMemo(
    () => ({
      left: styles['label-left'],
      right: styles['label-right'],
      center: styles['label-center'],
    }),
    [styles],
  );
  const pressableStyle = useMemo(
    () =>
      [
        styles.default,
        label ? labelStyleMap[label.position] : null,
        containerStyle,
        disabled && styles.disabled,
      ].filter(Boolean),
    [containerStyle, disabled, label, labelStyleMap, styles.default],
  );

  return (
    <Pressable style={pressableStyle} disabled={disabled} {...restProps}>
      <View testID={testID} />
      {label && <Text.XS style={textStyle}>{label.content}</Text.XS>}
      {icon}
    </Pressable>
  );
};

const Animated = ({
  icon,
  containerStyle,
  textStyle,
  label,
  duration = 250,
  rotateTo,
  onPressAnimation,
  testID,
  ...restProps
}: IconButtonProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const labelStyleMap = useMemo(
    () => ({
      left: styles['label-left-animated'],
      right: styles['label-right-animated'],
      center: styles['label-center-animated'],
    }),
    [styles],
  );
  const pressableStyle = useMemo(
    () =>
      [
        styles.default,
        label ? labelStyleMap[label.position] : null,
        containerStyle,
      ].filter(Boolean),
    [containerStyle, label, labelStyleMap, styles.default],
  );

  const [isRotated, setIsRotated] = useState(false);
  const rotateAnim = useSharedValue(0);

  useEffect(() => {
    if (rotateTo !== undefined) {
      rotateAnim.value = withTiming(isRotated ? rotateTo : 0, { duration });
    }
  }, [isRotated, rotateAnim, rotateTo, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${interpolate(rotateAnim.value, [0, 360], [0, 360])}deg`,
        },
      ],
    };
  }, [rotateAnim.value]);

  const handlePress = () => {
    setIsRotated(previous => !previous);
    if (onPressAnimation) onPressAnimation();
  };

  return (
    <Pressable style={pressableStyle} onPress={handlePress} {...restProps}>
      <View testID={testID} />
      {label && <Text.XS style={textStyle}>{label.content}</Text.XS>}
      <ReAnimated.View style={animatedStyle}>{icon}</ReAnimated.View>
    </Pressable>
  );
};

export const IconButton = {
  Static,
  Animated,
};

const getStyles = (theme: Theme) => {
  const labelBaseStyle: ViewStyle = {
    width: 'auto',
    gap: spacing.S,
  };
  const animatedLabelBaseStyle: ViewStyle = {
    ...labelBaseStyle,
    alignSelf: 'center',
  };

  return StyleSheet.create({
    default: {
      backgroundColor: theme.background.secondary,
      flexDirection: 'row',
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      borderRadius: radius.squareRounded,
      padding: spacing.S,
    },
    disabled: {
      backgroundColor: theme.background.tertiary,
    },
    'label-left': {
      ...labelBaseStyle,
      paddingLeft: spacing.M,
    },
    'label-right': {
      ...labelBaseStyle,
      flexDirection: 'row-reverse',
      paddingRight: spacing.M,
    },
    'label-left-animated': {
      ...animatedLabelBaseStyle,
      paddingLeft: spacing.M,
    },
    'label-right-animated': {
      ...animatedLabelBaseStyle,
      flexDirection: 'row-reverse',
      paddingRight: spacing.M,
    },
    'label-center': {
      alignSelf: 'center',
    },
    'label-center-animated': {
      ...animatedLabelBaseStyle,
      alignSelf: 'center',
    },
  });
};

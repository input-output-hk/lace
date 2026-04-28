import type { ImageSourcePropType } from 'react-native';

import React from 'react';
import { StyleSheet, View, Image, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { hexToRgba, type ColorType } from '../../util/commons';
import { useColor } from '../../util/hooks/useColor';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';
import type { BackgroundType } from '../../util/commons';

export interface ToastProps {
  backgroundType?: BackgroundType;
  color?: ColorType;
  leftIcon?: React.ReactNode;
  leftImage?: ImageSourcePropType;
  rightIcon?: React.ReactNode;
  subtitle?: string;
  text: string;
}

export const Toast = ({
  text,
  subtitle,
  backgroundType = 'colored',
  color = 'primary',
  leftIcon,
  leftImage,
  rightIcon,
}: ToastProps) => {
  const { theme } = useTheme();
  const { backgroundColorMap } = useColor();

  const styles = getStyles(theme, backgroundColorMap, color, backgroundType);

  const hasLeftContent = leftIcon || leftImage;

  return (
    <Animated.View style={styles.container} testID="toast-container">
      {hasLeftContent && (
        <View>
          {leftImage ? (
            <Image source={leftImage} style={styles.image} />
          ) : (
            <View style={styles.iconWrapper}>{leftIcon}</View>
          )}
        </View>
      )}

      <View style={styles.textContainer}>
        {!!subtitle && (
          <Text.XS style={styles.subtitle} testID="toast-subtitle">
            {subtitle}
          </Text.XS>
        )}
        <Text.XS style={styles.text} testID="toast-text">
          {text}
        </Text.XS>
      </View>

      {rightIcon && (
        <View>
          <View style={styles.iconWrapper}>{rightIcon}</View>
        </View>
      )}
    </Animated.View>
  );
};

const getStyles = (
  theme: Theme,
  backgroundColorMap: Record<ColorType, string>,
  color: ColorType,
  backgroundType: BackgroundType,
  // eslint-disable-next-line max-params
) => {
  let backgroundColor = 'transparent';
  let textColor = theme.text.primary;

  if (backgroundType === 'colored') {
    backgroundColor = backgroundColorMap[color];
    if (color === 'white' || color === 'neutral') {
      textColor = theme.brand.black;
    } else {
      textColor = theme.brand.white;
    }
  } else if (backgroundType === 'semiTransparent') {
    backgroundColor = hexToRgba(backgroundColorMap[color], 0.5);
    if (color === 'white' || color === 'neutral') {
      textColor = theme.brand.black;
    } else {
      textColor = theme.text.primary;
    }
  }

  const subtitleColor =
    color === 'white' || backgroundType === 'transparent'
      ? theme.text.primary
      : theme.text.tertiary;

  return StyleSheet.create({
    container: {
      backgroundColor,
      borderRadius: radius.M,
      padding: spacing.M,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.M,
      width: Platform.OS === 'web' ? 300 : '80%',
      alignSelf: 'center',
    },
    textContainer: {
      flex: 1,
      gap: spacing.XS,
    },
    text: {
      color: textColor,
    },
    subtitle: {
      color: subtitleColor,
    },
    image: {
      width: 45,
      height: 45,
      resizeMode: 'contain',
      borderRadius: radius.XS,
    },
    iconWrapper: {
      justifyContent: 'center',
      flex: 1,
    },
  });
};

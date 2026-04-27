import type { StyleProp, ViewStyle } from 'react-native';

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, useTheme } from '../../../design-tokens';
import { getBackgroundColor } from '../../util/commons';
import { useColor } from '../../util/hooks/useColor';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens/theme/types';
import type { ColorType } from '../../util/commons';

export interface BadgeProps {
  label: string;
  color?: ColorType;
  backgroundColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

interface StylesProps {
  backgroundColorMap: Record<ColorType, string>;
  color: ColorType | undefined;
  size: number;
  backgroundColorOverride?: string;
  theme: Theme;
}

const SIZES = {
  small: 16,
  medium: 24,
  large: 32,
};

export const Badge = ({
  label,
  color,
  backgroundColor: backgroundColorOverride,
  size = SIZES.medium,
  style,
}: BadgeProps) => {
  const { backgroundColorMap } = useColor();
  const { theme } = useTheme();

  const styles = getStyles({
    backgroundColorMap,
    color,
    size,
    backgroundColorOverride,
    theme,
  });

  return (
    <View style={[styles.container, style]}>
      <Text.XS style={styles.label} numberOfLines={1}>
        {label}
      </Text.XS>
    </View>
  );
};

const getLabelColor = (theme: Theme, color?: ColorType): string => {
  if (color === 'black') return theme.brand.white;
  if (color === 'white') return theme.brand.black;
  if (color === 'neutral') return theme.brand.yellow;
  if (color === 'positive') return theme.data.positive;
  if (color === 'negative') return theme.brand.white;

  return theme.brand.white;
};

const getStyles = ({
  backgroundColorMap,
  color,
  size,
  backgroundColorOverride,
  theme,
}: //textColor,
StylesProps) => {
  const backgroundColor =
    backgroundColorOverride ??
    getBackgroundColor(backgroundColorMap, color, 'colored');

  const fontSize = Math.max(9, Math.round(size * 0.55)); // Automatically calculated based on the size

  const textColor = getLabelColor(theme, color);

  return StyleSheet.create({
    container: {
      minWidth: size,
      height: size,
      borderRadius: radius.rounded,
      backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Math.round(size * 0.35), // Automatically calculated based on the size
    },
    label: {
      fontSize,
      lineHeight: size,
      color: textColor,
    },
  });
};

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Icon, Text } from '../../atoms';
import { getProgressBarColorForTheme } from '../../util/color-utils';

import type { Theme } from '../../../design-tokens';

export type ProgressBarColor =
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'primary'
  | 'secondary';

export type ProgressBarProps = {
  progress: number; // 0-100
  color?: ProgressBarColor;
  hasIcon?: boolean;
  showPercentage?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  isBackTransparent?: boolean;
  iconSize?: number;
};

export const ProgressBar = ({
  progress,
  color = 'primary',
  hasIcon = false,
  showPercentage = false,
  placeholder = '',
  style,
  isBackTransparent = false,
  iconSize = 16,
}: ProgressBarProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme, isBackTransparent);
  const progressColor = getProgressBarColorForTheme(color, theme);
  const progressWidth = Math.max(0, Math.min(100, progress));

  const [barWidth, setBarWidth] = useState(0);

  const barFillStyles = useMemo(
    () => ({
      backgroundColor: progressColor,
      width: barWidth ? (barWidth * progressWidth) / 100 : 0,
    }),
    [progressColor, progressWidth, barWidth],
  );

  const roundedPercentage = useMemo(() => Math.round(progress), [progress]);

  const handleBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.outerContainer, style]} testID="progress-bar">
      <View style={styles.barRow}>
        {hasIcon && <Icon name="AlertSquare" size={iconSize} />}
        {!!placeholder && <Text.XS variant="secondary">{placeholder}</Text.XS>}
        <View style={styles.barBackground} onLayout={handleBarLayout}>
          <View style={styles.barIncomplete} testID="progress-incomplete" />
          <View
            style={[styles.barFill, barFillStyles]}
            testID="progress-fill"
          />
        </View>
        {showPercentage && <Text.XS>{roundedPercentage}%</Text.XS>}
      </View>
    </View>
  );
};

const getStyles = (theme: Theme, isBackTransparent?: boolean) =>
  StyleSheet.create({
    outerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 2,
      backgroundColor: isBackTransparent
        ? 'transparent'
        : theme.background.page,
    },
    barRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
    },
    barBackground: {
      flex: 1,
      height: 8,
      borderRadius: radius.M,
      overflow: 'hidden',
      shadowColor: theme.extra.shadowDrop ?? theme.text.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
      position: 'relative',
    },
    barFill: {
      height: '100%',
      borderRadius: radius.M,
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 1,
    },
    barIncomplete: {
      height: '100%',
      backgroundColor: theme.background.secondary,
      borderRadius: radius.M,
      borderWidth: 1,
      borderColor: theme.border.top,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
    },
  });

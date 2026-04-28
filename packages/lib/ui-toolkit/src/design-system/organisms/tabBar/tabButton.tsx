import type { StyleProp, ViewStyle } from 'react-native';

import noop from 'lodash/noop';
import React, { useCallback, useMemo, useState, isValidElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Badge, Text } from '../../atoms';

import type { LayoutSize, Theme } from '../../../design-tokens';
import type { BadgeProps } from '../../atoms';

export interface TabButtonProps {
  label: string;
  accessibilityLabel: string;
  testID: string;
  isFocused: boolean;
  hideLabel?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  hoveredStyle?: StyleProp<ViewStyle>;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: BadgeProps['color'];
  onPress: () => void;
  onLongPress?: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({
  label,
  accessibilityLabel,
  testID,
  isFocused,
  hideLabel = false,
  containerStyle,
  hoveredStyle,
  icon,
  badge,
  badgeColor = 'negative',
  onPress,
  onLongPress = noop,
}) => {
  const { theme, layoutSize } = useTheme();

  const [isHovered, setIsHovered] = useState(false);

  const defaultStyles = useMemo(() => styles({ theme, layoutSize }), [theme]);

  const onHoverIn = useCallback(() => {
    if (!hoveredStyle) return;
    setIsHovered(true);
  }, []);

  const onHoverOut = useCallback(() => {
    if (!hoveredStyle) return;
    setIsHovered(false);
  }, []);

  const combinedStyle = useMemo(
    () =>
      [
        isFocused && defaultStyles.focusedContainer,
        hoveredStyle && isHovered && hoveredStyle,
        containerStyle,
      ].filter(Boolean),
    [isHovered, isFocused, hoveredStyle, containerStyle],
  );

  const accessibilityState = useMemo(() => {
    return isFocused ? { selected: true } : {};
  }, [isFocused]);

  const styledIcon = useMemo((): React.ReactNode => {
    if (isValidElement(icon)) {
      const iconElement = icon as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(iconElement, {
        ...iconElement.props,
        size: 20,
        strokeWidth: isFocused ? undefined : 2,
        variant: isFocused ? 'solid' : 'stroke',
      });
    }
    return icon;
  }, [icon, isFocused]);

  const badgeLabel = badge !== undefined ? String(badge) : undefined;

  return (
    <Pressable
      style={combinedStyle}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}>
      <View style={defaultStyles.iconWrapper}>
        {styledIcon}
        {badgeLabel && (
          <Badge
            label={badgeLabel}
            color={badgeColor}
            size={spacing.M}
            style={defaultStyles.badge}
          />
        )}
      </View>
      {!hideLabel && <Text.XS>{label}</Text.XS>}
    </Pressable>
  );
};

const styles = ({ theme }: { theme: Theme; layoutSize: LayoutSize }) =>
  StyleSheet.create({
    focusedContainer: {
      backgroundColor: theme.background.secondary,
    },
    iconWrapper: {
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: POSITIONS.top,
      right: POSITIONS.right,
    },
  });

const POSITIONS = {
  top: -16,
  right: -11,
};

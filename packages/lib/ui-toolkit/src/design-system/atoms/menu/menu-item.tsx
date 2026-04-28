import type { PressableProps, TextStyle, ViewStyle } from 'react-native';

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Text } from '../text/text';

export type MenuItemProps = Omit<PressableProps, 'style'> & {
  icon: React.ReactNode;
  label: string;
  textStyle?: TextStyle;
  containerStyle?: ViewStyle;
};

export const MenuItem = ({
  icon,
  label,
  textStyle,
  containerStyle,
  ...restProps
}: MenuItemProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.default,
        pressed && styles.pressed,
        containerStyle,
      ]}
      {...restProps}>
      {icon}
      {label && <Text.XS style={textStyle}>{label}</Text.XS>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  default: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    padding: spacing.M,
    gap: spacing.M,
  },
  pressed: {
    opacity: 0.9,
  },
});

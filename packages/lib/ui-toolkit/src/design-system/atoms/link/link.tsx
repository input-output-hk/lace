import type { TextStyle } from 'react-native';

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../../design-tokens';

import type { Theme } from '../../../design-tokens';

export type LinkProps = {
  label: string;
  textStyle?: TextStyle;
  isExternalLink?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export const Link = ({
  label,
  textStyle,
  onPress,
  disabled = false,
  ...restProps
}: LinkProps) => {
  const { theme } = useTheme();
  const linkStyles = styles(theme);

  return (
    <Pressable
      accessibilityRole="link"
      disabled={disabled}
      onPress={onPress}
      {...restProps}>
      <Text
        style={[
          linkStyles.linkText,
          disabled && linkStyles.disabled,
          textStyle,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    link: {
      cursor: 'pointer', // only used in web context
    },
    linkText: {
      color: theme.brand.ascendingSecondary,
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.5,
    },
  });

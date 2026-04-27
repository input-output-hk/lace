import type { StyleProp, ViewStyle } from 'react-native';

import React from 'react';
import { StyleSheet } from 'react-native';

import { useTheme, radius, spacing } from '../../../design-tokens';
import { BlurView } from '../blur-view/blur-view';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';

type BlurredLabelProps = {
  text: string;
  size?: 'M' | 'S' | 'XS';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const BlurredLabel = ({
  text,
  size = 'S',
  style,
  testID,
}: BlurredLabelProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const getTextComponent = () => {
    switch (size) {
      case 'XS':
        return (
          <Text.XS
            style={styles.labelText}
            numberOfLines={1}
            ellipsizeMode="tail">
            {text}
          </Text.XS>
        );
      case 'S':
        return (
          <Text.S
            style={styles.labelText}
            numberOfLines={1}
            ellipsizeMode="tail">
            {text}
          </Text.S>
        );
      case 'M':
        return (
          <Text.M
            style={styles.labelText}
            numberOfLines={1}
            ellipsizeMode="tail">
            {text}
          </Text.M>
        );
      default:
        return (
          <Text.XS
            style={styles.labelText}
            numberOfLines={1}
            ellipsizeMode="tail">
            {text}
          </Text.XS>
        );
    }
  };

  return (
    <BlurView style={[styles.blurContainer, style]} testID={testID}>
      {getTextComponent()}
    </BlurView>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    blurContainer: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.S,
      padding: spacing.XS,
      overflow: 'hidden',
    },
    labelText: {
      textAlign: 'center',
      color: theme.text.primary,
      overflow: 'hidden',
    },
  });

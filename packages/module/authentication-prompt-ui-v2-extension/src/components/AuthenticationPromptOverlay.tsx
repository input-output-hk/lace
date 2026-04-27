import type { ReactNode } from 'react';

import { useTheme, spacing, getOverlayColor } from '@lace-lib/ui-toolkit';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

type AuthenticationPromptOverlayPrompt = {
  children: ReactNode;
};

export const AuthenticationPromptOverlay = ({
  children,
}: AuthenticationPromptOverlayPrompt) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const { height: viewportHeight, width: viewportWidth } =
  Dimensions.get('window');

const createStyles = (theme: Theme) => {
  const overlayColor = getOverlayColor(theme);

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: overlayColor,
      display: 'flex',
      height: viewportHeight,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      top: 0,
      width: viewportWidth,
    },
    content: {
      margin: spacing.XL,
    },
  });
};

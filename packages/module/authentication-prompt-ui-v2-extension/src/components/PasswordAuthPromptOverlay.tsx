import type { ReactNode } from 'react';

import { useTheme, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

type PasswordAuthPromptOverlayPrompt = {
  children: ReactNode;
};

export const PasswordAuthPromptOverlay = ({
  children,
}: PasswordAuthPromptOverlayPrompt) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      flex: 1,
      alignItems: 'center',
      backgroundColor: theme.background.overlay,
      display: 'flex',
      justifyContent: 'center',
      position: 'absolute',
      zIndex: 1,
      elevation: 1,
    },
    content: {
      flexGrow: 0.3,
      width: '90%',
      maxWidth: 460,
      margin: spacing.XL,
    },
  });

import type { ReactNode } from 'react';

import { backdropStyle, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type PasswordAuthPromptOverlayPrompt = {
  children: ReactNode;
};

export const PasswordAuthPromptOverlay = ({
  children,
}: PasswordAuthPromptOverlayPrompt) => (
  <View style={styles.container}>
    <View style={styles.content}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...backdropStyle,
    alignItems: 'center',
    justifyContent: 'center',
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

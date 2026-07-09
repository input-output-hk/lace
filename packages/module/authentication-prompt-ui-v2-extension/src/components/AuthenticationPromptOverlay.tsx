import type { ReactNode } from 'react';

import { backdropStyle, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type AuthenticationPromptOverlayPrompt = {
  children: ReactNode;
};

export const AuthenticationPromptOverlay = ({
  children,
}: AuthenticationPromptOverlayPrompt) => (
  <View style={styles.container}>
    <View style={styles.content}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...backdropStyle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    margin: spacing.XL,
  },
});

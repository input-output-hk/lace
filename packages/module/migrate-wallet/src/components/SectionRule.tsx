import { useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * A rule that is actually visible on the wizard card. The shared Divider paints
 * `theme.background.secondary`, which is exactly this card's own fill, so it
 * came out invisible everywhere the wizard used it.
 */
export const SectionRule = () => {
  const { theme } = useTheme();
  return <View style={[styles.rule, { backgroundColor: theme.border.top }]} />;
};

const styles = StyleSheet.create({
  rule: {
    height: 1,
    width: '100%',
  },
});

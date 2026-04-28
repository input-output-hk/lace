import React from 'react';
import { View, StyleSheet } from 'react-native';

import { useTheme } from '../../../design-tokens';

import type { Theme } from '../../../design-tokens';

export const Divider = () => {
  const { theme } = useTheme();
  const styles = getStyles({ theme });

  return <View style={styles.divider} />;
};

const getStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    divider: {
      height: 1,
      width: '100%',
      backgroundColor: theme.background.secondary,
    },
  });

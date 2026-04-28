import type { ViewProps } from 'react-native';

import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Box = ({ children, style, ...restProps }: ViewProps) => {
  return (
    <View style={[styles.box, style]} {...restProps}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flex: 1,
  },
});

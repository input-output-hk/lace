import type { ViewProps } from 'react-native';

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

interface RowProps extends ViewProps {
  justifyContent?:
    | 'center'
    | 'flex-end'
    | 'flex-start'
    | 'space-around'
    | 'space-between'
    | 'space-evenly';
  alignItems?: 'baseline' | 'center' | 'flex-end' | 'flex-start' | 'stretch';
  gap?: number;
}

export const Row = ({
  children,
  justifyContent = 'flex-start',
  alignItems,
  gap,
  style,
  ...restProps
}: RowProps) => {
  const memoizedStyle = useMemo(
    () =>
      [styles.row, { justifyContent, alignItems, gap }, style].filter(Boolean),
    [justifyContent, alignItems, gap, style],
  );

  return (
    <View style={memoizedStyle} {...restProps}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

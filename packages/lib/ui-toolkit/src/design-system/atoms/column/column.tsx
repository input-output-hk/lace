import type { ViewProps } from 'react-native';

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

interface ColumnProps extends ViewProps {
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

export const Column = ({
  children,
  justifyContent = 'flex-start',
  alignItems,
  gap,
  style,
  ...props
}: ColumnProps) => {
  const memoizedStyle = useMemo(
    () =>
      [styles.column, { justifyContent, alignItems, gap }, style].filter(
        Boolean,
      ),
    [justifyContent, alignItems, gap, style],
  );

  return (
    <View style={memoizedStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    flexDirection: 'column',
  },
});

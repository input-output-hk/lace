import type { StyleProp, ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';

type GradientPointsType = { x: number; y: number } | [number, number];

interface LinearGradientComponentProps {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start?: GradientPointsType;
  end?: GradientPointsType;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: React.ReactNode;
}

export const LinearGradientComponent = ({
  colors,
  locations,
  start,
  end,
  style,
  testID,
  children,
}: LinearGradientComponentProps) => {
  // Normalize start and end props to handle both object and array formats
  const normalizedStart = Array.isArray(start)
    ? { x: start[0], y: start[1] }
    : start;
  const normalizedEnd = Array.isArray(end) ? { x: end[0], y: end[1] } : end;

  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={normalizedStart}
      end={normalizedEnd}
      style={style ?? StyleSheet.absoluteFill}
      testID={testID}>
      {children}
    </LinearGradient>
  );
};

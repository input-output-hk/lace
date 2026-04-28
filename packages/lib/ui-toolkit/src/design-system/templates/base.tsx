import type { StatusBarStyle } from 'react-native';

import React from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design-tokens';
import { LinearGradientComponent } from '../atoms';
import { getIsDark, hexToRgba, isWeb } from '../util';

import type { EdgeInsets } from 'react-native-safe-area-context';

type BaseTemplateProps = {
  children: React.ReactNode;
};

export const BaseTemplate = ({ children }: BaseTemplateProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles({ insets, theme });

  const isDark = getIsDark(theme);
  const barStyle: StatusBarStyle = `${isDark ? 'light' : 'dark'}-content`;

  const edge = theme.brand.ascendingSecondary;
  const lightAscending = hexToRgba(edge, 0.4);
  const lighterAscending = hexToRgba(edge, 0.15);

  const webColors: readonly [string, string, ...string[]] = [
    edge,
    lightAscending,
    lighterAscending,
    theme.background.page,
    theme.background.page,
    lighterAscending,
    lightAscending,
    edge,
  ];

  const mobileColors: readonly [string, string, ...string[]] = [
    edge,
    theme.background.page,
    theme.background.page,
    edge,
  ];

  const colors = isWeb ? webColors : mobileColors;
  const locations: readonly [number, number, ...number[]] = isWeb
    ? [0, 0.05, 0.12, 0.28, 0.72, 0.88, 0.95, 1]
    : [0, 0.3, 0.6, 1];

  return (
    <>
      <StatusBar
        animated
        barStyle={barStyle}
        backgroundColor={theme.background.page}
      />
      <LinearGradientComponent
        colors={colors}
        locations={locations}
        style={styles.safeAreaView}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}>
        {children}
      </LinearGradientComponent>
    </>
  );
};

const getStyles = ({
  insets,
  theme,
}: {
  insets: EdgeInsets;
  theme: { background: { page: string } };
}) =>
  StyleSheet.create({
    safeAreaView: {
      flex: 1,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      backgroundColor: theme.background.page,
    },
  });

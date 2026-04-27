import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../design-tokens';
import { radius, spacing } from '../../../design-tokens';
import { Text } from '../../atoms';
import { getSaturationColor } from '../../util/color-utils';
import { ProgressBar } from '../progressBar/progressBar';

import type { Theme } from '../../../design-tokens/theme/types';

export type PoolStatusTileVariant =
  | 'blocks'
  | 'cost'
  | 'saturation-alternative'
  | 'saturation';

export type PoolStatusTileProps = {
  ticker: string;
  saturationPercentage: number;
  variant?: PoolStatusTileVariant;
  metricValue?: number;
  metricLabel?: string;
  style?: React.ComponentProps<typeof View>['style'];
};

export const PoolStatusTile = ({
  ticker,
  saturationPercentage,
  variant = 'saturation',
  metricValue,
  metricLabel: _metricLabel,
  style,
}: PoolStatusTileProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(theme);

  const saturationColor = getSaturationColor(saturationPercentage);
  const roundedSaturation = useMemo(
    () => Math.round(saturationPercentage),
    [saturationPercentage],
  );

  const renderContent = () => {
    switch (variant) {
      case 'saturation':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.textRow}>
              <Text.XS style={styles.ticker}>{ticker}</Text.XS>
              <Text.XS style={styles.percentage}>{roundedSaturation}%</Text.XS>
            </View>
            <ProgressBar
              progress={saturationPercentage}
              color={saturationColor}
            />
          </View>
        );

      case 'saturation-alternative':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.textRow}>
              <Text.XS style={styles.ticker}>{ticker}</Text.XS>
              <Text.XS style={styles.saturationLabel}>
                {roundedSaturation}% {t('v2.generic.pool.status.saturation')}
              </Text.XS>
            </View>
            <ProgressBar
              progress={saturationPercentage}
              color={saturationColor}
            />
          </View>
        );

      case 'cost':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.textRow}>
              <Text.XS style={styles.ticker}>{ticker}</Text.XS>
              <Text.XS style={styles.metricValue}>
                {metricValue} {t('v2.generic.pool.status.cost')}
              </Text.XS>
            </View>
            <ProgressBar
              progress={saturationPercentage}
              color={saturationColor}
              showPercentage={true}
            />
          </View>
        );

      case 'blocks':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.textRow}>
              <Text.XS style={styles.ticker}>{ticker}</Text.XS>
              <Text.XS style={styles.metricValue}>
                {metricValue} {t('v2.generic.pool.status.blocks')}
              </Text.XS>
            </View>
            <ProgressBar
              progress={saturationPercentage}
              color={saturationColor}
              showPercentage={true}
            />
          </View>
        );

      default:
        return (
          <View style={styles.contentContainer}>
            <View style={styles.textRow}>
              <Text.XS style={styles.ticker}>{ticker}</Text.XS>
              <Text.XS style={styles.percentage}>{roundedSaturation}%</Text.XS>
            </View>
            <ProgressBar
              progress={saturationPercentage}
              color={saturationColor}
            />
          </View>
        );
    }
  };

  return <View style={[styles.container, style]}>{renderContent()}</View>;
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      padding: spacing.M,
      shadowColor: theme.extra.shadowDrop ?? theme.text.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    contentContainer: {
      gap: spacing.S,
    },
    textRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ticker: {
      color: theme.text.primary,
    },
    percentage: {
      color: theme.text.primary,
    },
    saturationLabel: {
      color: theme.text.secondary,
    },
    metricValue: {
      color: theme.text.primary,
    },
    metricLabel: {
      color: theme.text.secondary,
    },
    saturationRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    saturationText: {
      color: theme.text.secondary,
    },
    metricContainer: {
      alignItems: 'flex-end',
      gap: spacing.XS,
    },
    tickerContainer: {
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
  });

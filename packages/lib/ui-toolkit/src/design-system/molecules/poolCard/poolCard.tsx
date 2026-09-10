/* eslint-disable react-native/no-inline-styles */
import type { StyleProp, ViewStyle } from 'react-native';

import { compactNumberWithUnit } from '@lace-lib/util-render';
import React, { useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Card, Row, Text, Column } from '../../atoms';
import { getSaturationColor, isWeb, poolShortLabel } from '../../util';
import { ProgressBar } from '../progressBar/progressBar';

import type { BrowsePoolSortOption } from '../../util/types';
import type { LaceBrowsePool } from '@lace-contract/cardano-stake-pools';

export interface PoolCardProps {
  cardStyle: StyleProp<ViewStyle>;
  displayLovelaces: (lovelaces: number) => string;
  pool: LaceBrowsePool;
  onPress: (poolId: string) => void;
  placeholder: string;
  variant?: BrowsePoolSortOption;
}

export const PoolCard = ({
  cardStyle,
  displayLovelaces,
  pool,
  onPress,
  placeholder,
  variant,
}: PoolCardProps) => {
  const inlineValue = useMemo(() => {
    switch (variant) {
      case undefined:
      case 'ranking':
      case 'ticker':
      case 'saturation':
        // The ranking score is a comparison, not a rate: it assumes every pool
        // makes all its blocks (see rank-pools.ts), so printing it would lend
        // it a precision it has not earned. Saturation is the honest figure to
        // lead with on the recommended order.
        return `${pool.liveSaturation}%`;
      case 'margin':
        return `${Math.round(pool.margin * 100 * 100) / 100}%`;
      case 'blocks':
        return compactNumberWithUnit(pool.blocks.toString(), 0);
      case 'cost':
        return displayLovelaces(pool.cost);
      case 'liveStake':
        return displayLovelaces(pool.liveStake);
      case 'pledge':
        return displayLovelaces(pool.declaredPledge);
      case 'ros':
        // A fraction (see LaceBrowsePool.ros); "~" because it is an estimate
        // from live values, never a promise. Placeholder until network data
        // arrives to estimate against.
        return pool.ros === undefined
          ? '—'
          : `~${Math.round(pool.ros * 100 * 100) / 100}%`;
    }
  }, [displayLovelaces, pool, variant]);

  const handlePress = useCallback(() => {
    onPress(pool.poolId);
  }, [onPress, pool.poolId]);

  return (
    <Pressable
      onPress={handlePress}
      style={{ width: '100%' }}
      testID={`pool-card-${pool.ticker ?? pool.poolId}`}>
      <Card blur={!isWeb} cardStyle={cardStyle}>
        <Column>
          <Row alignItems="center" justifyContent="space-between">
            <Text.S>{poolShortLabel(pool.ticker, pool.poolId)}</Text.S>
            <Row alignItems="center" gap={spacing.S}>
              <Text.XS>{inlineValue}</Text.XS>
            </Row>
          </Row>
          <Row alignItems="center" style={{ width: '100%' }}>
            <ProgressBar
              progress={pool.liveSaturation}
              // Same thresholds the details sheet and the delegation sheet
              // use. The list is where the pool is actually CHOSEN, so a
              // saturation those screens paint red must not read as neutral
              // brand colour here.
              color={getSaturationColor(pool.liveSaturation)}
              showPercentage={false}
              isBackTransparent={true}
              style={{ flex: 1 }}
              hasIcon={false}
              placeholder={placeholder}
            />
          </Row>
        </Column>
      </Card>
    </Pressable>
  );
};

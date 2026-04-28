/* eslint-disable react-native/no-inline-styles */
import type { StyleProp, ViewStyle } from 'react-native';

import { compactNumberWithUnit } from '@lace-lib/util-render';
import React, { useCallback, useMemo } from 'react';
import { Pressable } from 'react-native-gesture-handler';

import { spacing } from '../../../design-tokens';
import { Card, Row, Text, Column } from '../../atoms';
import { isWeb } from '../../util';
import { ProgressBar } from '../progressBar/progressBar';

import type { BrowsePoolSortOption, LaceBrowsePool } from '../../util/types';

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
      case 'ticker':
      case 'saturation':
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
    }
  }, [displayLovelaces, pool, variant]);

  const handlePress = useCallback(() => {
    onPress(pool.poolId);
  }, [onPress, pool.poolId]);

  return (
    <Pressable onPress={handlePress} style={{ width: '100%' }}>
      <Card blur={!isWeb} cardStyle={cardStyle}>
        <Column>
          <Row alignItems="center" justifyContent="space-between">
            <Text.S>{pool.ticker ?? '??'}</Text.S>
            <Row alignItems="center" gap={spacing.S}>
              <Text.XS>{inlineValue}</Text.XS>
            </Row>
          </Row>
          <Row alignItems="center" style={{ width: '100%' }}>
            <ProgressBar
              progress={pool.liveSaturation}
              color="primary"
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

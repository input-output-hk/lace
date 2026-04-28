import type { StyleProp, ViewStyle } from 'react-native';

import React from 'react';

import { spacing } from '../../../../design-tokens';
import { Avatar, Column, Row, Text } from '../../../atoms';

interface PoolOverviewProps {
  poolAvatarFallback: string;
  poolName: string;
  poolTicker: string;
  poolInfoColumnStyle?: StyleProp<ViewStyle>;
}

export const PoolOverview = ({
  poolAvatarFallback,
  poolName,
  poolTicker,
  poolInfoColumnStyle,
}: PoolOverviewProps) => {
  return (
    <Row alignItems="center" gap={spacing.M}>
      <Avatar
        content={{ fallback: poolAvatarFallback }}
        size={38}
        shape="rounded"
      />
      <Column style={poolInfoColumnStyle}>
        <Text.M>{poolName}</Text.M>
        <Text.XS variant="secondary">{poolTicker}</Text.XS>
      </Column>
    </Row>
  );
};

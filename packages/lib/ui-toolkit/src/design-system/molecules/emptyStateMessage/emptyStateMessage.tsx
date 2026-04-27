import type { StyleProp, ViewStyle } from 'react-native';

import React from 'react';

import { spacing } from '../../../design-tokens';
import { Column, Icon, Text } from '../../atoms';

interface EmptyStateMessageProps {
  message: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const EmptyStateMessage = ({
  message,
  style,
  testID = 'empty-state-message',
}: EmptyStateMessageProps) => (
  <Column
    alignItems="center"
    justifyContent="center"
    gap={spacing.M}
    style={style}
    testID={testID}>
    <Icon name="Sad" size={48} variant="solid" />
    <Text.M variant="secondary" align="center">
      {message}
    </Text.M>
  </Column>
);

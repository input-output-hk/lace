import {
  Column,
  Divider,
  Row,
  shouldTruncateText,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

interface ActivityDetailItemProps {
  testID?: string;
  label: string;
  value?: ReactNode | string;
  shouldShowDivider?: boolean;
}

export const ActivityDetailItem = ({
  testID,
  label,
  value,
  shouldShowDivider = false,
}: ActivityDetailItemProps) => (
  <Column>
    <Row
      testID={testID}
      justifyContent="space-between"
      style={styles.container}
      gap={spacing.S}>
      <Text.M testID={`${testID}-label`} variant="secondary">
        {label}
      </Text.M>
      {React.isValidElement(value) ? (
        value
      ) : (
        <Text.M
          testID={`${testID}-value`}
          style={styles.valueText}
          numberOfLines={1}
          accessibilityLabel={typeof value === 'string' ? value : undefined}>
          {shouldTruncateText(value)}
        </Text.M>
      )}
    </Row>
    {shouldShowDivider && <Divider />}
  </Column>
);

const styles = StyleSheet.create({
  valueText: {
    textAlign: 'right',
    flex: 1,
  },
  container: {
    marginBottom: spacing.M,
  },
});

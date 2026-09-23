import { Column, Row, Text, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

export interface ReviewRowProps {
  label: string;
  value: string;
  /** Optional fiat value rendered under the primary value. */
  fiat?: string;
  testID?: string;
}

/**
 * Label/value row styled like the dapp sign-tx sheet: a secondary label on the
 * left, a right-aligned value (with an optional fiat line beneath) on the right.
 * Shared by the RealFi review + withdraw sheets so both render identical rows.
 */
export const ReviewRow = ({ label, value, fiat, testID }: ReviewRowProps) => (
  <Row justifyContent="space-between" alignItems="flex-start" testID={testID}>
    <Column style={styles.labelContainer}>
      <Text.XS variant="secondary">{label}</Text.XS>
    </Column>
    <Column style={styles.valueContainer} alignItems="flex-end">
      <Text.XS style={styles.valueText}>{value}</Text.XS>
      {fiat ? (
        <Text.XS variant="secondary" style={styles.valueText}>
          {fiat}
        </Text.XS>
      ) : null}
    </Column>
  </Row>
);

const styles = StyleSheet.create({
  labelContainer: {
    flexShrink: 1,
    maxWidth: '40%',
    marginRight: spacing.M,
  },
  valueContainer: {
    flexShrink: 1,
    maxWidth: '60%',
  },
  valueText: {
    textAlign: 'right',
  },
});

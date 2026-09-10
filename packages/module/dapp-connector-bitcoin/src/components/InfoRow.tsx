import { Column, Row, Text } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Props for the InfoRow component.
 */
export interface InfoRowProps {
  /** Left-side label (string or custom node e.g. label + icon) */
  label?: React.ReactNode;
  /** Primary value to display on right */
  value: React.ReactNode | string;
  /** Secondary value below primary (e.g., a tag or a fiat conversion) */
  secondaryValue?: React.ReactNode;
  /** Vertical alignment of the row content (default: flex-start) */
  alignItems?: 'center' | 'flex-start';
  /** Test identifier */
  testID?: string;
}

/**
 * Displays a key-value row for sign review details, such as an address, a
 * fee, or an account name, in a consistent label-value format. Supports a
 * secondary value for additional context (e.g., an "Own" tag).
 */
export const InfoRow = ({
  label,
  value,
  secondaryValue,
  alignItems = 'flex-start',
  testID,
}: InfoRowProps) => {
  return (
    <Row testID={testID} alignItems={alignItems} style={styles.row}>
      {label && (
        <Column style={styles.labelContainer}>
          {typeof label === 'string' ? (
            <Text.XS variant="secondary" style={styles.labelText}>
              {label}
            </Text.XS>
          ) : (
            label
          )}
        </Column>
      )}
      <Column
        alignItems="flex-end"
        style={[styles.valueContainer, !label && styles.valueFullWidth]}>
        <View style={styles.valueContent}>
          {typeof value === 'string' ? (
            <View style={styles.valueTextWrapper}>
              <Text.XS style={styles.valueText}>{value}</Text.XS>
            </View>
          ) : (
            <View style={styles.valueCustomWrapper}>{value}</View>
          )}
          {secondaryValue &&
            (typeof secondaryValue === 'string' ? (
              <View style={styles.valueTextWrapper}>
                <Text.XS variant="secondary" style={styles.valueText}>
                  {secondaryValue}
                </Text.XS>
              </View>
            ) : (
              <View style={styles.valueCustomWrapper}>{secondaryValue}</View>
            ))}
        </View>
      </Column>
    </Row>
  );
};

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  labelContainer: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '33%',
    marginRight: 12,
  },
  labelText: {
    width: '100%',
  },
  valueContainer: {
    flex: 2,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '67%',
  },
  valueContent: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    minWidth: 0,
    width: '100%',
  },
  valueTextWrapper: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    minWidth: 0,
    width: '100%',
  },
  valueText: {
    width: '100%',
    textAlign: 'right',
    flexShrink: 1,
  },
  valueCustomWrapper: {
    alignSelf: 'flex-end',
  },
  valueFullWidth: {
    flex: 1,
    maxWidth: '100%',
    marginLeft: 0,
  },
});

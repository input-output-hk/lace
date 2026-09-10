import { Column, Row, spacing, Text, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { cardLayout } from './card-styles';
import { IconBadge } from './IconBadge';
import { wizardText } from './wizard-styles';

import type { IconName } from '@lace-lib/ui-toolkit';

export interface FactRowProps {
  /**
   * What the row is about. Omitted for rows nested under the figure they
   * explain, where the glyph would claim they are facts of their own.
   */
  icon?: IconName;
  /** What the figure is. A phrase, not a sentence — sentences go in `note`. */
  label: string;
  /** The figure. Omitted for rows that are only a statement. */
  value?: string;
  /**
   * Why the figure is what it is. Kept in the same row as the figure it
   * explains: as a separate bullet it reads as an unrelated caveat.
   */
  note?: string;
  /** Green, for the one figure here that is money arriving rather than leaving. */
  valuePositive?: boolean;
  /** Renders the figure as a link (e.g. a transaction id opening the explorer). */
  onValuePress?: () => void;
  testID?: string;
  valueTestID?: string;
}

/**
 * One fact from the discovery: what it is, and how much of it there is. The
 * label and value are deliberately different sizes — these are the figures the
 * user confirms before an irreversible sweep, and setting both halves the same
 * size makes the amounts disappear into their own captions.
 */
export const FactRow = ({
  icon,
  label,
  value,
  note,
  valuePositive = false,
  onValuePress,
  testID,
  valueTestID,
}: FactRowProps) => {
  const { theme } = useTheme();

  const valueText = value !== undefined && (
    <Text.M
      style={[
        styles.value,
        valuePositive ? { color: theme.data.positive } : undefined,
        onValuePress ? { color: theme.brand.ascendingSecondary } : undefined,
      ]}
      testID={valueTestID}>
      {value}
    </Text.M>
  );

  return (
    <Row
      gap={spacing.M}
      alignItems={note ? 'flex-start' : 'center'}
      testID={testID}>
      {icon !== undefined && <IconBadge name={icon} />}
      <Column gap={spacing.XS} style={cardLayout.body}>
        <Text.S style={wizardText.smallLine}>{label}</Text.S>
        {note !== undefined && (
          <Text.S variant="tertiary" style={wizardText.smallLine}>
            {note}
          </Text.S>
        )}
      </Column>
      {onValuePress === undefined ? (
        valueText
      ) : (
        <Pressable
          accessibilityRole="link"
          onPress={onValuePress}
          style={styles.valueLink}>
          {valueText}
        </Pressable>
      )}
    </Row>
  );
};

const styles = StyleSheet.create({
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
  // The pressable inherits the text's shrink behaviour, or a long value would
  // push the row wider than the card instead of truncating.
  valueLink: {
    flexShrink: 1,
  },
});

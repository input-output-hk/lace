import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Text, Icon, Column } from '../../../atoms';

import type { IconName } from '../../../atoms';

interface StatusSheetProps {
  body: string;
  /** Optional secondary line under `body` for a concrete reason (e.g. the
   * specific ledger/build error behind a friendly failure message). */
  detail?: string;
  icon?: {
    name: IconName;
    variant?: 'solid' | 'stroke';
    size?: number;
  };
  testID?: string;
}

export const StatusSheet = ({
  body,
  detail,
  icon,
  testID = 'status-sheet',
}: StatusSheetProps) => {
  return (
    <Column
      testID={testID}
      justifyContent="center"
      alignItems="center"
      gap={spacing.XXL}
      style={styles.centeredContent}>
      {!!icon && (
        <Icon
          name={icon.name}
          size={icon.size || 48}
          variant={icon.variant || 'stroke'}
          testID={`${testID}-icon`}
        />
      )}
      <Column alignItems="center" gap={spacing.S} style={styles.message}>
        <Text.M
          align="center"
          style={styles.message}
          testID={`${testID}-message`}>
          {body}
        </Text.M>
        {!!detail && (
          <Text.S
            align="center"
            variant="secondary"
            style={styles.message}
            testID={`${testID}-detail`}>
            {detail}
          </Text.S>
        )}
      </Column>
    </Column>
  );
};

const styles = StyleSheet.create({
  centeredContent: {
    marginVertical: '30%',
    marginHorizontal: spacing.M,
  },
  // Fill the (center-aligned) column width so a long unbreakable body — e.g. a
  // 64-char tx id — wraps instead of stretching the Text past the sheet edge.
  message: {
    alignSelf: 'stretch',
  },
});

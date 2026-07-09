import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Text, Icon, Column } from '../../../atoms';

import type { IconName } from '../../../atoms';

interface StatusSheetProps {
  body: string;
  icon?: {
    name: IconName;
    variant?: 'solid' | 'stroke';
    size?: number;
  };
  testID?: string;
}

export const StatusSheet = ({
  body,
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
      <Text.M align="center" testID={`${testID}-message`}>
        {body}
      </Text.M>
    </Column>
  );
};

const styles = StyleSheet.create({
  centeredContent: {
    marginVertical: '30%',
    marginHorizontal: spacing.M,
  },
});

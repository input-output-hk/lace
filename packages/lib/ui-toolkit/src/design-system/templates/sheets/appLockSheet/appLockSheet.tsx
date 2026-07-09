import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text } from '../../../atoms';
import { RadioGroup } from '../../../molecules';

interface AppLockSheetProps {
  description: string;
  infoLabel: string;
  lockTimeOutOptions: Array<{ label: string; value: string }>;
  selectedLockTimeout: string;
  onLockTimeoutChange: (value: string) => void;
}

export const AppLockSheet = ({
  description,
  infoLabel,
  lockTimeOutOptions,
  selectedLockTimeout,
  onLockTimeoutChange,
}: AppLockSheetProps) => {
  return (
    <Column style={styles.content} gap={spacing.S}>
      <Text.M testID="app-lock-inactivity-timeout-description-1">
        {infoLabel}
      </Text.M>
      <Text.XS
        style={styles.infoText}
        variant="secondary"
        testID="app-lock-inactivity-timeout-info">
        {description}
      </Text.XS>
      <RadioGroup
        testID="app-lock-inactivity-timeout-sheet"
        options={lockTimeOutOptions}
        value={selectedLockTimeout}
        onChange={onLockTimeoutChange}
        direction="column"
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.L,
  },
  infoText: {
    paddingBottom: spacing.M,
  },
});

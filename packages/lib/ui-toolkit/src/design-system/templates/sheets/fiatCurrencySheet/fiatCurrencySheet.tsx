import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { RadioGroup } from '../../../molecules';
import { Sheet } from '../../../organisms';

interface FiatCurrencySheetProps {
  radioOptions: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export const FiatCurrencySheet = ({
  radioOptions,
  value,
  onChange,
  testID = 'fiat-currency-sheet',
}: FiatCurrencySheetProps) => {
  return (
    <Sheet.Scroll testID={testID} contentContainerStyle={styles.container}>
      <RadioGroup
        options={radioOptions}
        value={value}
        onChange={onChange}
        direction="column"
      />
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.L,
  },
});

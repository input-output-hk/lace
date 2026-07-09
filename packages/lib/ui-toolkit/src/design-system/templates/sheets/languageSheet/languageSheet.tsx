import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text } from '../../../atoms';
import { RadioGroup } from '../../../molecules';
import { footerHeight } from '../../../organisms';

interface LanguageSheetProps {
  description: string;
  radioOptions: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}

export const LanguageSheet = ({
  description,
  radioOptions,
  value,
  onChange,
}: LanguageSheetProps) => {
  return (
    <Column testID="language-sheet" style={styles.container}>
      <Text.S>{description}</Text.S>
      <RadioGroup
        options={radioOptions}
        value={value}
        onChange={onChange}
        direction="column"
        style={styles.radioGroup}
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
  radioGroup: {
    marginTop: spacing.L,
    gap: spacing.M,
  },
});

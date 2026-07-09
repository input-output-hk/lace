import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column } from '../../../atoms';
import { RadioGroup } from '../../../molecules';
import { footerHeight } from '../../../organisms';

import type { RadioGroupOption } from '../../../molecules';

interface ThemeSelectionProps {
  options: RadioGroupOption[];
  selectedTheme: string;
  handleThemeChange: (theme: string) => void;
}

export const ThemeSelection = ({
  options,
  selectedTheme,
  handleThemeChange,
}: ThemeSelectionProps) => {
  return (
    <Column alignItems="flex-start" style={styles.container}>
      <RadioGroup
        options={options}
        direction="column"
        value={selectedTheme}
        onChange={handleThemeChange}
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
});

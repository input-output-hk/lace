import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, spacing, radius } from '../../../design-tokens';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';

export interface IndexedChipProps {
  index: number;
  children: React.ReactNode;
  testID?: string;
}

export const IndexedChip: React.FC<IndexedChipProps> = ({
  index,
  children,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container} testID={testID}>
      <Text.XS>{String(index).padStart(2, '0')}.</Text.XS>
      {children}
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      marginBottom: spacing.XS,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.XS,
      paddingHorizontal: spacing.S,
      borderRadius: radius.M,
      borderTopColor: theme.border.top,
      borderColor: theme.border.middle,
      borderBottomColor: theme.border.bottom,
      borderWidth: StyleSheet.hairlineWidth,
    },
  });

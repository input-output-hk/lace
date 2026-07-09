import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Text, Icon } from '../../../atoms';
import { footerHeight, Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens/theme/types';

interface HardwareWalletDiscoveryErrorProps {
  errorMessage: string;
  instructionText: string;
  detailText: string;
  linkText: string;
  testID?: string;
}

export const HardwareWalletDiscoveryError = ({
  errorMessage,
  instructionText,
  detailText,
  linkText,
  testID = 'hardware-wallet-discovery-error-sheet',
}: HardwareWalletDiscoveryErrorProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme, footerHeight]);

  return (
    <Sheet.Scroll
      testID={testID}
      contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        <Icon name="UsbError" size={64} color={theme.background.negative} />
        <Text.M style={styles.errorMessage}>{errorMessage}</Text.M>
        <View style={styles.instructionContainer}>
          <Icon name="InformationCircle" size={16} />
          <Text.S style={styles.instructionText}>{instructionText}</Text.S>
        </View>
        <Text.S style={styles.detailText}>
          {detailText} <Text.S style={styles.linkText}>{linkText}</Text.S>
        </Text.S>
      </View>
    </Sheet.Scroll>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight.horizontal,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.M,
    },
    errorMessage: {
      textAlign: 'center',
    },
    instructionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.XS,
    },
    instructionText: {
      textAlign: 'center',
    },
    detailText: {
      textAlign: 'center',
      paddingHorizontal: spacing.M,
    },
    linkText: {
      color: theme.brand.ascending,
    },
  });

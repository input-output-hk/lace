import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Text, Icon } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens/theme/types';

interface HardwareWalletDiscoveryErrorProps {
  title: string;
  errorCode: string;
  instructionText: string;
  detailText: string;
  linkText: string;
  cancelButtonLabel: string;
  onClose?: () => void;
  testID?: string;
  closeButtonTestID?: string;
}

export const HardwareWalletDiscoveryError = ({
  title,
  errorCode,
  instructionText,
  detailText,
  linkText,
  cancelButtonLabel,
  onClose,
  testID = 'hardware-wallet-discovery-error-sheet',
  closeButtonTestID = 'hardware-wallet-discovery-error-close-button',
}: HardwareWalletDiscoveryErrorProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, onClose ? footerHeight : 0),
    [theme, onClose, footerHeight],
  );

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <View style={styles.content}>
          <Icon name="UsbError" size={64} color={theme.background.negative} />
          <Text.M style={styles.errorCode}>Error {errorCode}</Text.M>
          <View style={styles.instructionContainer}>
            <Icon name="InformationCircle" size={16} />
            <Text.S style={styles.instructionText}>{instructionText}</Text.S>
          </View>
          <Text.S style={styles.detailText}>
            {detailText} <Text.S style={styles.linkText}>{linkText}</Text.S>
          </Text.S>
        </View>
      </Sheet.Scroll>
      {onClose && (
        <SheetFooter
          primaryButton={{
            label: cancelButtonLabel,
            onPress: onClose,
            testID: closeButtonTestID,
          }}
        />
      )}
    </>
  );
};

const getStyles = (theme: Theme, paddingBottom: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.M,
    },
    errorCode: {
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

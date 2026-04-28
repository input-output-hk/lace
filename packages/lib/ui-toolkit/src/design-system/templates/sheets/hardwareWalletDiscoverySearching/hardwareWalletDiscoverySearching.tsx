import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Text, Loader, Icon } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens/theme/types';

interface HardwareWalletDiscoverySearchingProps {
  title: string;
  statusText: string;
  instructionText: string;
  detailText: string;
  linkText: string;
  cancelButtonLabel: string;
  onCancel?: () => void;
  testID?: string;
  cancelButtonTestID?: string;
}

export const HardwareWalletDiscoverySearching = ({
  title,
  statusText,
  instructionText,
  detailText,
  linkText,
  cancelButtonLabel,
  onCancel,
  testID = 'hardware-wallet-discovery-searching-sheet',
  cancelButtonTestID = 'hardware-wallet-discovery-searching-cancel-button',
}: HardwareWalletDiscoverySearchingProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, onCancel ? footerHeight : 0),
    [theme, onCancel, footerHeight],
  );

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <View style={styles.content}>
          <Loader size={64} color={theme.text.primary} />
          <Text.M style={styles.statusText}>{statusText}</Text.M>
          <View style={styles.instructionContainer}>
            <Icon name="InformationCircle" size={16} />
            <Text.S style={styles.instructionText}>{instructionText}</Text.S>
          </View>
          <Text.S style={styles.detailText}>
            {detailText} <Text.S style={styles.linkText}>{linkText}</Text.S>
          </Text.S>
        </View>
      </Sheet.Scroll>
      {onCancel && (
        <SheetFooter
          primaryButton={{
            label: cancelButtonLabel,
            onPress: onCancel,
            testID: cancelButtonTestID,
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
    statusText: {
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

import type { TextStyle } from 'react-native';

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Avatar, Column, Divider, Icon, Row, Text } from '../../../atoms';
import { Accordion } from '../../../molecules';
import { footerHeight, Sheet } from '../../../organisms';
import { useCopyToClipboard } from '../../../util';
import { TotalBreakdown } from '../stakeDelegationSheet/TotalBreakdown';

// wordBreak is web-only; RN types don't include it but RN Web supports it.
// The raw CBOR and hashes are unbroken strings that would clip otherwise.
const breakAllStyle = { wordBreak: 'break-all' } as TextStyle;

export interface DRepDelegationSheetProps {
  // Header
  headerTitle: string;

  // DRep being delegated to
  drepLabel: string;
  drepValue: string;
  /** Resolved DRep display name; falls back to `drepValue` (id/option label). */
  drepName?: string;
  /** CIP-119 avatar; the User icon renders when absent or failing to load. */
  drepAvatarUri?: string;

  // Source account
  sourceAccountLabel: string;
  sourceAccountName: string;

  // Total breakdown
  totalBreakdownLabel: string;
  stakeKeyDepositLabel?: string;
  stakeKeyDepositAda?: string;
  transactionFeeLabel: string;
  transactionFeeAda: string;
  totalLabel: string;
  totalAda: string;

  // Collapsible transaction detail sections
  certificate?: { title: string; rows: { label: string; value: string }[] };
  rawTransaction?: { title: string; cbor: string };

  // Actions
  onCancelPress: () => void;
  onDelegatePress: () => void;
  cancelButtonLabel: string;
  delegateButtonLabel: string;
  /** Disables the delegate button (fees not ready, or tx in flight). */
  delegateButtonDisabled?: boolean;
  /** Shows the button spinner while signing/submitting. */
  delegateButtonLoading?: boolean;

  testID?: string;
}

export const DRepDelegationSheet = ({
  headerTitle,
  drepLabel,
  drepValue,
  drepName,
  drepAvatarUri,
  sourceAccountLabel,
  sourceAccountName,
  totalBreakdownLabel,
  stakeKeyDepositLabel,
  stakeKeyDepositAda,
  transactionFeeLabel,
  transactionFeeAda,
  totalLabel,
  totalAda,
  certificate,
  rawTransaction,
  onCancelPress,
  onDelegatePress,
  cancelButtonLabel,
  delegateButtonLabel,
  delegateButtonDisabled,
  delegateButtonLoading,
  testID = 'drep-delegation-sheet',
}: DRepDelegationSheetProps) => {
  const { theme } = useTheme();
  const { copyToClipboard } = useCopyToClipboard();

  const cbor = rawTransaction?.cbor;
  const handleCopyCbor = useCallback(() => {
    if (cbor !== undefined) copyToClipboard(cbor);
  }, [copyToClipboard, cbor]);

  return (
    <>
      <Sheet.Header title={headerTitle} />
      <Sheet.Scroll testID={testID} contentContainerStyle={styles.sheetContent}>
        <Column style={styles.content} gap={spacing.L}>
          <Column gap={spacing.M}>
            <Column gap={spacing.XS}>
              <Text.M variant="secondary">{drepLabel}</Text.M>
              <Row alignItems="center" gap={spacing.S}>
                <Avatar
                  size={32}
                  shape="rounded"
                  content={{
                    ...(drepAvatarUri !== undefined && {
                      img: { uri: drepAvatarUri },
                    }),
                  }}
                  fallbackIcon="User"
                  testID={`${testID}-drep-avatar`}
                />
                <Text.M
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  style={styles.drepValue}
                  testID={`${testID}-drep-value`}>
                  {drepName ?? drepValue}
                </Text.M>
              </Row>
            </Column>
            <Row justifyContent="space-between">
              <Text.M variant="secondary">{sourceAccountLabel}</Text.M>
              <Text.M testID={`${testID}-source-account`}>
                {sourceAccountName}
              </Text.M>
            </Row>
          </Column>

          <Divider />

          <TotalBreakdown
            totalBreakdownLabel={totalBreakdownLabel}
            stakeKeyDepositLabel={stakeKeyDepositLabel}
            stakeKeyDepositAda={stakeKeyDepositAda}
            transactionFeeLabel={transactionFeeLabel}
            transactionFeeAda={transactionFeeAda}
            totalLabel={totalLabel}
            totalAda={totalAda}
          />

          {certificate && (
            <Accordion.Root
              title={certificate.title}
              isInitiallyExpanded
              testID={`${testID}-certificate`}>
              <Column gap={spacing.S} style={styles.accordionContent}>
                {certificate.rows.map(row => (
                  <Row
                    key={row.label}
                    justifyContent="space-between"
                    gap={spacing.M}>
                    <Text.M variant="secondary">{row.label}</Text.M>
                    <Text.S style={[styles.certificateValue, breakAllStyle]}>
                      {row.value}
                    </Text.S>
                  </Row>
                ))}
              </Column>
            </Accordion.Root>
          )}

          {rawTransaction && (
            <Accordion.Root
              title={rawTransaction.title}
              testID={`${testID}-raw-tx`}>
              <View
                style={[
                  styles.cborBox,
                  { backgroundColor: theme.background.tertiary },
                ]}>
                <Pressable
                  onPress={handleCopyCbor}
                  style={styles.copyButton}
                  testID={`${testID}-raw-tx-copy`}>
                  <Icon name="Copy" size={18} />
                </Pressable>
                <Text.XS style={breakAllStyle} testID={`${testID}-raw-tx-cbor`}>
                  {rawTransaction.cbor}
                </Text.XS>
              </View>
            </Accordion.Root>
          )}
        </Column>
      </Sheet.Scroll>
      <Sheet.Footer
        secondaryButton={{
          label: cancelButtonLabel,
          onPress: onCancelPress,
          testID: `${testID}-cancel-button`,
        }}
        primaryButton={{
          label: delegateButtonLabel,
          onPress: onDelegatePress,
          disabled: delegateButtonDisabled,
          loading: delegateButtonLoading,
          testID: `${testID}-delegate-button`,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    padding: spacing.L,
    paddingBottom: footerHeight.horizontal,
  },
  content: {
    paddingTop: spacing.M,
  },
  drepValue: {
    flex: 1,
  },
  accordionContent: {
    paddingTop: spacing.S,
  },
  certificateValue: {
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.M,
  },
  cborBox: {
    marginTop: spacing.S,
    padding: spacing.M,
    borderRadius: spacing.S,
  },
  copyButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.XS,
  },
});

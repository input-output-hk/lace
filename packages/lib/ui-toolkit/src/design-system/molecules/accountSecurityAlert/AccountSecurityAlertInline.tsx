import { useAccountSecurityAlert } from '@lace-contract/cardano-context';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';

import { AccountSecurityAlertChip } from './AccountSecurityAlertChip';
import { AccountSecurityAlertDisclosure } from './AccountSecurityAlertDisclosure';

import type { AccountId } from '@lace-contract/wallet-repo';

interface AccountSecurityAlertInlineProps {
  accountId: AccountId;
  testID?: string;
}

/**
 * Compound: chip + disclosure stacked vertically, with local state for the
 * expand toggle. Drop-in for surfaces that have column-layout room for the
 * disclosure to reveal below the chip (Receive, SignTx, ReviewTransaction,
 * Buy, SwapCenter, Send, Claim).
 *
 * For tighter layouts (dropdown menu items, string-based tags) use the
 * standalone `AccountSecurityAlertChip` and place the disclosure via
 * `AccountSecurityAlertDisclosure` elsewhere in the render tree, or omit
 * the disclosure entirely.
 */
export const AccountSecurityAlertInline = ({
  accountId,
  testID,
}: AccountSecurityAlertInlineProps) => {
  const alert = useAccountSecurityAlert(accountId);
  const [isExpanded, setIsExpanded] = useState(false);
  const toggle = useCallback(() => {
    setIsExpanded(previous => !previous);
  }, []);

  if (!alert) return null;

  return (
    <View
      style={styles.container}
      testID={testID ?? 'account-security-alert-inline'}>
      <AccountSecurityAlertChip
        accountId={accountId}
        onPress={toggle}
        expanded={isExpanded}
      />
      <AccountSecurityAlertDisclosure
        accountId={accountId}
        expanded={isExpanded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.XS,
  },
});

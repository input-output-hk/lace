import { useAccountSecurityAlert } from '@lace-contract/cardano-context';
import React from 'react';

import { SecurityAlertPill } from '../../atoms/securityAlertPill/securityAlertPill';

import type { AccountId } from '@lace-contract/wallet-repo';

interface AccountSecurityAlertChipProps {
  accountId: AccountId;
  /** Local-toggle handler. Optional so the chip can also be used purely as an
   *  affordance sitting next to an account name without an expander. */
  onPress?: () => void;
  /** Toggles the chevron direction and the a11y `expanded` state. */
  expanded?: boolean;
  testID?: string;
}

/**
 * Compact tappable pill that surfaces the per-exploit name-suffix (e.g.
 * "At risk") next to a Cardano account name wherever the account is
 * presented. Returns null when the account has no flagged exploits or the
 * WALLET_SECURITY_ALERTS feature flag is off, so callers can drop it in
 * unconditionally.
 *
 * The visual lives in ui-toolkit (`SecurityAlertPill`) so the account
 * center and other non-app-mobile surfaces can render the same shape
 * without pulling in this hook.
 */
export const AccountSecurityAlertChip = ({
  accountId,
  onPress,
  expanded = false,
  testID,
}: AccountSecurityAlertChipProps) => {
  const alert = useAccountSecurityAlert(accountId);

  if (!alert) return null;

  return (
    <SecurityAlertPill
      label={alert.chipLabel}
      onPress={onPress}
      expanded={expanded}
      testID={testID ?? 'account-security-alert-chip'}
    />
  );
};

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Text, Logos, Column } from '../../../atoms';
import { DropdownMenu } from '../../../molecules';
import { footerHeight } from '../../../organisms';

import type { AvatarContent } from '../../../../utils/avatarUtils';

type DropdownItem = {
  id: string;
  text: string;
  avatar?: AvatarContent;
};

interface BuySheetProps {
  accountName: string;
  dropdownItems: DropdownItem[];
  selectedAccountId?: string;
  actionText: string;
  disclaimerTitle: string;
  disclaimerText: React.ReactNode;
  onAccountSelection: (index: number) => void;
  testID?: string;
  /** Optional node rendered between the account dropdown and the service
   *  disclaimer. Used by the wallet app to surface an inline security-alert
   *  for a compromised selected account without navigating away. */
  belowAccountSlot?: React.ReactNode;
}

export const BuySheet = ({
  accountName,
  dropdownItems,
  selectedAccountId,
  actionText,
  disclaimerTitle,
  disclaimerText,
  onAccountSelection,
  testID = 'buy-sheet',
  belowAccountSlot,
}: BuySheetProps) => {
  return (
    <Column testID={testID} style={styles.container}>
      {/* Account Dropdown */}
      <DropdownMenu
        title={accountName}
        items={dropdownItems}
        selectedItemId={selectedAccountId}
        onSelectItem={onAccountSelection}
        titleAvatar={{
          fallback: accountName.substring(0, 2).toUpperCase(),
        }}
        actionText={actionText}
        testID={`${testID}-account-dropdown-menu`}
      />
      {belowAccountSlot}

      {/* Service Disclaimer */}
      <View style={styles.disclaimerSection}>
        <Text.S testID={`${testID}-disclaimer-title`}>{disclaimerTitle}</Text.S>
        <View style={styles.logoContainer}>
          <Logos.BanxaFull size={200} testID="banxa-logo" />
        </View>
        <Text.XS testID={`${testID}-disclaimer-text`}>{disclaimerText}</Text.XS>
      </View>
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.M,
    paddingBottom: footerHeight.horizontal,
    gap: spacing.M,
  },
  disclaimerSection: {
    alignItems: 'center',
    gap: spacing.M,
    marginTop: spacing.L,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: spacing.S,
  },
});

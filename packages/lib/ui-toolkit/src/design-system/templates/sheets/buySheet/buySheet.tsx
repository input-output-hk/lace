import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Text, Logos } from '../../../atoms';
import {
  DropdownMenu,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { AvatarContent } from '../../../../utils/avatarUtils';

type DropdownItem = {
  id: string;
  text: string;
  avatar?: AvatarContent;
};

interface BuySheetProps {
  heading: string;
  accountName: string;
  dropdownItems: DropdownItem[];
  selectedAccountId?: string;
  actionText: string;
  disclaimerTitle: string;
  disclaimerText: React.ReactNode;
  buttonLabel: string;
  onAccountSelection: (index: number) => void;
  onBuyPress: () => void;
  testID?: string;
}

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    container: {
      padding: spacing.M,
      gap: spacing.M,
      paddingBottom: footerHeight,
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

export const BuySheet = ({
  heading,
  accountName,
  dropdownItems,
  selectedAccountId,
  actionText,
  disclaimerTitle,
  disclaimerText,
  buttonLabel,
  onAccountSelection,
  onBuyPress,
  testID = 'buy-sheet',
}: BuySheetProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = getStyles(footerHeight);

  return (
    <>
      <SheetHeader title={heading} testID={`${testID}-header`} />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
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

        {/* Service Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Text.S testID={`${testID}-disclaimer-title`}>
            {disclaimerTitle}
          </Text.S>
          <View style={styles.logoContainer}>
            <Logos.BanxaFull size={200} testID="banxa-logo" />
          </View>
          <Text.XS testID={`${testID}-disclaimer-text`}>
            {disclaimerText}
          </Text.XS>
        </View>
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={{
          label: buttonLabel,
          onPress: onBuyPress,
          preIconName: 'Link',
          iconColor: theme.brand.white,
          testID: 'fund-my-wallet-button',
        }}
      />
    </>
  );
};

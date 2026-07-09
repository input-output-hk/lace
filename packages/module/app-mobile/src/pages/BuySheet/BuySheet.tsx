import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  AccountSecurityAlertInline,
  BuySheet as BuySheetTemplate,
  Sheet,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';

import { useBuySheet } from './useBuySheet';

import type { SheetRoutes } from '@lace-lib/navigation';

export const BuySheet = (props: SheetScreenProps<SheetRoutes.Buy>) => {
  const { theme } = useTheme();
  const {
    accountName,
    selectedAccount,
    dropdownItems,
    actionText,
    handleOpenBanxaUrl,
    handleAccountSelection,
    t,
  } = useBuySheet(props);
  const heading = t('v2.buy-flow.heading.sheet');
  const buttonLabel = t('v2.buy-flow.button');

  useEffect(() => {
    props.navigation.setOptions({
      header: <Sheet.Header title={heading} testID="buy-sheet-header" />,
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonLabel,
            onPress: handleOpenBanxaUrl,
            preIconName: 'Link',
            iconColor: theme.brand.white,
            testID: 'fund-my-wallet-button',
          }}
        />
      ),
    });
  }, [
    props.navigation,
    heading,
    buttonLabel,
    handleOpenBanxaUrl,
    theme.brand.white,
  ]);

  const renderDisclaimerText = useCallback(() => {
    const text = String(t('v2.buy-flow.disclaimer.text'));
    const linkText = String(t('v2.buy-flow.disclaimer.link'));

    // Find the first occurrence of the link text and create a single link
    const linkIndex = text.indexOf(linkText);

    if (linkIndex === -1) {
      // If link text not found, return the original text
      return text;
    }

    const beforeLink = text.substring(0, linkIndex);
    const afterLink = text.substring(linkIndex + linkText.length);

    return (
      <React.Fragment>
        {beforeLink}
        <Text.XS
          style={{ color: theme.brand.ascending }}
          onPress={handleOpenBanxaUrl}>
          {linkText}
        </Text.XS>
        {afterLink}
      </React.Fragment>
    );
  }, [t, handleOpenBanxaUrl, theme.brand.ascending]);

  return (
    <BuySheetTemplate
      accountName={accountName || t('v2.generic.account.select')}
      dropdownItems={dropdownItems || []}
      selectedAccountId={selectedAccount?.accountId}
      actionText={actionText}
      disclaimerTitle={t('v2.buy-flow.disclaimer.title')}
      disclaimerText={renderDisclaimerText()}
      onAccountSelection={handleAccountSelection}
      testID="buy-sheet"
      belowAccountSlot={
        selectedAccount?.accountId ? (
          <AccountSecurityAlertInline accountId={selectedAccount.accountId} />
        ) : undefined
      }
    />
  );
};

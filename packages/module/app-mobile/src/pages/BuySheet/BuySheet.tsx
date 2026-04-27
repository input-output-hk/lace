import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  BuySheet as BuySheetTemplate,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

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
      heading={t('v2.buy-flow.heading.sheet')}
      accountName={accountName || t('v2.generic.account.select')}
      dropdownItems={dropdownItems || []}
      selectedAccountId={selectedAccount?.accountId}
      actionText={actionText}
      disclaimerTitle={t('v2.buy-flow.disclaimer.title')}
      disclaimerText={renderDisclaimerText()}
      buttonLabel={t('v2.buy-flow.button')}
      onAccountSelection={handleAccountSelection}
      onBuyPress={handleOpenBanxaUrl}
      testID="buy-sheet"
    />
  );
};

import {
  AccountSecurityAlertInline,
  ReceiveSheet as ReceiveSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useReceiveSheet } from './useReceiveSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const ReceiveSheet = ({
  navigation,
}: SheetScreenProps<SheetRoutes.Receive>) => {
  const {
    headerTitle,
    dropdownItems,
    onSelectItem,
    shareText,
    buyAssetsText,
    onBuyAssetsPress,
    aliasEntries,
    theme,
    actionText,
    userFallback,
    addressData,
    accountName,
    accountId,
    selectedAccountIndex,
    copyAddressText,
    onCopyAddressPress,
    onSharePress,
    qrCodeBgColor,
    getAddressInfo,
    selectedAddressTabIndex,
    onSelectAddressTab,
    currentAddress,
  } = useReceiveSheet();

  useEffect(() => {
    const areFooterButtonsVertical = !!(buyAssetsText && onBuyAssetsPress);

    navigation.setOptions({
      header: (
        <Sheet.Header title={headerTitle} testID="receive-sheet-header" />
      ),
      footer: currentAddress ? (
        <Sheet.Footer
          vertical={areFooterButtonsVertical}
          primaryButton={
            areFooterButtonsVertical
              ? {
                  label: buyAssetsText,
                  onPress: onBuyAssetsPress,
                  testID: 'receive-sheet-buy-assets-button',
                }
              : {
                  label: shareText,
                  onPress: () => {
                    onSharePress(currentAddress.address);
                  },
                  preIconName: 'Share',
                  testID: 'receive-sheet-share-button',
                }
          }
          secondaryButton={
            areFooterButtonsVertical
              ? {
                  label: shareText,
                  onPress: () => {
                    onSharePress(currentAddress.address);
                  },
                  preIconName: 'Share',
                  testID: 'receive-sheet-share-button',
                }
              : undefined
          }
        />
      ) : undefined,
    });
  }, [
    navigation,
    headerTitle,
    shareText,
    buyAssetsText,
    onBuyAssetsPress,
    onSharePress,
    currentAddress,
  ]);

  if (!addressData) {
    return null;
  }

  return (
    <ReceiveSheetTemplate
      addressData={addressData}
      accountName={accountName}
      index={selectedAccountIndex}
      items={dropdownItems}
      onSelectItem={onSelectItem}
      aliasEntries={aliasEntries}
      theme={theme}
      fallback={userFallback}
      actionText={actionText}
      copyAddressText={copyAddressText}
      onCopyAddressPress={onCopyAddressPress}
      qrCodeBgColor={qrCodeBgColor}
      getAddressInfo={getAddressInfo}
      selectedAddressTabIndex={selectedAddressTabIndex}
      onSelectAddressTab={onSelectAddressTab}
      belowAccountSlot={
        accountId ? (
          <AccountSecurityAlertInline accountId={accountId} />
        ) : undefined
      }
    />
  );
};

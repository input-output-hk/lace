import { ReceiveSheet as ReceiveSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useReceiveSheet } from './useReceiveSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const ReceiveSheet = (_: SheetScreenProps<SheetRoutes.Receive>) => {
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
    selectedAccountIndex,
    copyAddressText,
    onCopyAddressPress,
    onSharePress,
    qrCodeBgColor,
    getAddressInfo,
    selectedAddressTabIndex,
    onSelectAddressTab,
  } = useReceiveSheet();

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
      footerButtonText={shareText}
      aliasEntries={aliasEntries}
      theme={theme}
      fallback={userFallback}
      actionText={actionText}
      copyAddressText={copyAddressText}
      headerTitle={headerTitle}
      onCopyAddressPress={onCopyAddressPress}
      qrCodeBgColor={qrCodeBgColor}
      onSharePress={onSharePress}
      getAddressInfo={getAddressInfo}
      buyAssetsButtonText={buyAssetsText}
      onBuyAssetsPress={onBuyAssetsPress}
      selectedAddressTabIndex={selectedAddressTabIndex}
      onSelectAddressTab={onSelectAddressTab}
    />
  );
};

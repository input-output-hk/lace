import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useRestoreWalletSuccessSheet } from './useRestoreWalletSuccessSheet';

import type { SheetScreenProps, SheetRoutes } from '@lace-lib/navigation';

export const RestoreWalletSuccessSheet = (
  props: SheetScreenProps<SheetRoutes.RestoreWalletSuccess>,
) => {
  const { image, title, body, buttonText, onButtonPress } =
    useRestoreWalletSuccessSheet(props);

  return (
    <StatusSheet
      icon={image}
      title={title}
      body={body}
      buttonText={buttonText}
      buttonAction={onButtonPress}
      testID="restore-wallet-success-sheet"
      buttonTestID="restore-wallet-success-view"
    />
  );
};

export default RestoreWalletSuccessSheet;

import { type SheetScreenProps } from '@lace-lib/navigation';
import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useSuccessCreateNewWalletSheet } from './useSuccessCreateNewWalletSheet';

import type { SheetRoutes } from '@lace-lib/navigation';

export const SuccessCreateNewWalletSheet = (
  props: SheetScreenProps<SheetRoutes.SuccessCreateNewWallet>,
) => {
  const { image, title, body, buttonText, onButtonPress } =
    useSuccessCreateNewWalletSheet(props);

  return (
    <StatusSheet
      icon={image}
      title={title}
      body={body}
      buttonText={buttonText}
      buttonAction={onButtonPress}
      testID="create-new-wallet-success-sheet"
      buttonTestID="create-new-wallet-success-view"
    />
  );
};

export default SuccessCreateNewWalletSheet;

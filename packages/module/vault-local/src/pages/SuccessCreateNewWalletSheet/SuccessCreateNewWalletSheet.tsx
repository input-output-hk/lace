import { type SheetScreenProps } from '@lace-lib/navigation';
import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useSuccessCreateNewWalletSheet } from './useSuccessCreateNewWalletSheet';

import type { SheetRoutes } from '@lace-lib/navigation';

export const SuccessCreateNewWalletSheet = (
  props: SheetScreenProps<SheetRoutes.SuccessCreateNewWallet>,
) => {
  const { image, title, body, buttonText, onButtonPress } =
    useSuccessCreateNewWalletSheet(props);

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={title}
          testID="create-new-wallet-success-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: onButtonPress,
            testID: 'create-new-wallet-success-view',
          }}
        />
      ),
    });
  }, [props.navigation, title, buttonText, onButtonPress]);

  return (
    <StatusSheet
      icon={image}
      body={body}
      testID="create-new-wallet-success-sheet"
    />
  );
};

export default SuccessCreateNewWalletSheet;

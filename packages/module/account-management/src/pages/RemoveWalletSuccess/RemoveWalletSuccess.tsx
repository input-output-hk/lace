import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useRemoveWalletSuccess } from './useRemoveWalletSuccess';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const RemoveWalletSuccess = ({
  navigation,
}: SheetScreenProps<SheetRoutes.RemoveWalletSuccess>) => {
  const { title, body, buttonText, buttonAction } = useRemoveWalletSuccess();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={title}
          testID="remove-wallet-success-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: buttonAction,
            testID: 'remove-wallet-success-sheet-button',
          }}
        />
      ),
    });
  }, [navigation, title, buttonText, buttonAction]);

  return (
    <StatusSheet
      body={body}
      icon={{ name: 'AlertSquare', variant: 'solid' }}
      testID="remove-wallet-success-sheet"
    />
  );
};

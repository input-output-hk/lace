import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useEditWalletSuccess } from './useEditWalletSuccess';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const EditWalletSuccess = ({
  navigation,
}: SheetScreenProps<SheetRoutes.EditWalletSuccess>) => {
  const { title, body, buttonText, buttonAction, icon } =
    useEditWalletSuccess();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header title={title} testID="edit-wallet-success-sheet-header" />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: buttonAction,
            testID: 'edit-wallet-success-sheet-button',
          }}
        />
      ),
    });
  }, [navigation, title, buttonText, buttonAction]);

  return (
    <StatusSheet body={body} icon={icon} testID="edit-wallet-success-sheet" />
  );
};

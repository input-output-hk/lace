import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useRemoveAccountSuccess } from './useRemoveAccountSuccess';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const RemoveAccountSuccess = ({
  navigation,
}: SheetScreenProps<SheetRoutes.RemoveAccountSuccess>) => {
  const { title, body, buttonText, buttonAction } = useRemoveAccountSuccess();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={title}
          testID="remove-account-success-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: buttonAction,
            testID: 'remove-account-success-sheet-button',
          }}
        />
      ),
    });
  }, [navigation, title, buttonText, buttonAction]);

  return (
    <StatusSheet
      body={body}
      icon={{ name: 'AlertSquare', variant: 'solid' }}
      testID="remove-account-success-sheet"
    />
  );
};

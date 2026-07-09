import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useCustomizeAccountSuccess } from './useCustomizeAccountSuccess';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const CustomizeAccountSuccess = ({
  navigation,
}: SheetScreenProps<SheetRoutes.CustomizeAccountSuccess>) => {
  const { title, body, buttonText, buttonAction } =
    useCustomizeAccountSuccess();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={title}
          testID="customize-account-success-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: buttonAction,
            testID: 'customize-account-success-confirm-button',
          }}
        />
      ),
    });
  }, [navigation, title, buttonText, buttonAction]);

  return (
    <StatusSheet
      body={body}
      icon={{ name: 'RelievedFace', variant: 'solid' }}
      testID="customize-account-success-sheet"
    />
  );
};

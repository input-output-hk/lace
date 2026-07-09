import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useRestoreWalletSuccessSheet } from './useRestoreWalletSuccessSheet';

import type { SheetScreenProps, SheetRoutes } from '@lace-lib/navigation';

export const RestoreWalletSuccessSheet = (
  props: SheetScreenProps<SheetRoutes.RestoreWalletSuccess>,
) => {
  const { image, title, body, buttonText, onButtonPress } =
    useRestoreWalletSuccessSheet(props);

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={title}
          testID="restore-wallet-success-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: onButtonPress,
            testID: 'restore-wallet-success-view',
          }}
        />
      ),
    });
  }, [props.navigation, title, buttonText, onButtonPress]);

  return (
    <StatusSheet
      icon={image}
      body={body}
      testID="restore-wallet-success-sheet"
    />
  );
};

export default RestoreWalletSuccessSheet;

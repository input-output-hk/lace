import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useAddedAccountFailed } from './useAddedAccountFailed';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddedAccountFailed = ({
  navigation,
}: SheetScreenProps<SheetRoutes.AddedAccountFailed>) => {
  const { title, body, buttonText, buttonAction, buttonTestID, testID } =
    useAddedAccountFailed();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={title} testID={`${testID}-header`} />,
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: buttonAction,
            testID: buttonTestID,
          }}
        />
      ),
    });
  }, [navigation, title, buttonText, buttonAction, buttonTestID, testID]);

  return <StatusSheet body={body} testID={testID} />;
};

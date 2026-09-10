import { Sheet, StatusSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useAddedAccountSuccess } from './useAddedAccountSuccess';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddedAccountSuccess = ({
  navigation,
}: SheetScreenProps<SheetRoutes.AddedAccountSuccess>) => {
  const { title, body, buttonText, buttonAction, buttonTestID, testID, icon } =
    useAddedAccountSuccess();

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

  return <StatusSheet body={body} testID={testID} icon={icon} />;
};

import {
  Sheet,
  StatusSheet as StatusSheetTemplate,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useSuccessRecoveryPhraseVerification } from './useSuccessRecoveryPhraseVerification';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SuccessRecoveryPhraseVerification = ({
  navigation,
}: SheetScreenProps<SheetRoutes.SuccessRecoveryPhraseVerification>) => {
  const { title, body, image, buttonText, buttonAction } =
    useSuccessRecoveryPhraseVerification();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={title} testID="status-sheet-header" />,
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: buttonText,
            onPress: buttonAction,
            testID: 'status-sheet-button',
          }}
        />
      ),
    });
  }, [navigation, title, buttonText, buttonAction]);

  return (
    <StatusSheetTemplate body={body} icon={{ name: image, variant: 'solid' }} />
  );
};

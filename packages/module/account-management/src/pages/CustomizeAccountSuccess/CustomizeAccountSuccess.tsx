import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCustomizeAccountSuccess } from './useCustomizeAccountSuccess';

export const CustomizeAccountSuccess = () => {
  const { title, body, buttonText, buttonAction } =
    useCustomizeAccountSuccess();

  return (
    <StatusSheet
      title={title}
      body={body}
      icon={{ name: 'RelievedFace', variant: 'solid' }}
      buttonText={buttonText}
      buttonAction={buttonAction}
      testID="customize-account-success-sheet"
      buttonTestID="customize-account-success-confirm-button"
    />
  );
};

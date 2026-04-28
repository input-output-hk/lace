import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useRemoveAccountSuccess } from './useRemoveAccountSuccess';

export const RemoveAccountSuccess = () => {
  const { title, body, buttonText, buttonAction } = useRemoveAccountSuccess();
  return (
    <StatusSheet
      title={title}
      body={body}
      icon={{ name: 'AlertSquare', variant: 'solid' }}
      buttonText={buttonText}
      buttonAction={buttonAction}
      testID="remove-account-success-sheet"
      buttonTestID="remove-account-success-sheet-button"
    />
  );
};

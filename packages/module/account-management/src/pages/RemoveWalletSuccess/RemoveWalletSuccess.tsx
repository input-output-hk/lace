import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useRemoveWalletSuccess } from './useRemoveWalletSuccess';

export const RemoveWalletSuccess = () => {
  const { title, body, buttonText, buttonAction } = useRemoveWalletSuccess();

  return (
    <StatusSheet
      title={title}
      body={body}
      icon={{ name: 'AlertSquare', variant: 'solid' }}
      buttonText={buttonText}
      buttonAction={buttonAction}
      testID="remove-wallet-success-sheet"
      buttonTestID="remove-wallet-success-sheet-button"
    />
  );
};

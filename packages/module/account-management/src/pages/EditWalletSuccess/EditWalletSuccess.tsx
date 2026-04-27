import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useEditWalletSuccess } from './useEditWalletSuccess';

export const EditWalletSuccess = () => {
  const { title, body, buttonText, buttonAction, icon } =
    useEditWalletSuccess();

  return (
    <StatusSheet
      title={title}
      body={body}
      icon={icon}
      buttonText={buttonText}
      buttonAction={buttonAction}
      testID="edit-wallet-success-sheet"
      buttonTestID="edit-wallet-success-sheet-button"
    />
  );
};

import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddedAccountFailed } from './useAddedAccountFailed';

export const AddedAccountFailed = () => {
  const { title, body, buttonText, buttonAction, buttonTestID, testID } =
    useAddedAccountFailed();
  return (
    <StatusSheet
      title={title}
      body={body}
      buttonText={buttonText}
      buttonAction={buttonAction}
      buttonTestID={buttonTestID}
      testID={testID}
    />
  );
};

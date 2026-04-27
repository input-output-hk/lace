import { StatusSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddedAccountSuccess } from './useAddedAccountSuccess';

export const AddedAccountSuccess = () => {
  const { title, body, buttonText, buttonAction, buttonTestID, testID, icon } =
    useAddedAccountSuccess();
  return (
    <StatusSheet
      title={title}
      body={body}
      buttonText={buttonText}
      buttonAction={buttonAction}
      buttonTestID={buttonTestID}
      testID={testID}
      icon={icon}
    />
  );
};

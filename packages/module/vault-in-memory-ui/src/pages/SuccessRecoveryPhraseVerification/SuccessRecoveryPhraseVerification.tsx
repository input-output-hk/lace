import { StatusSheet as StatusSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useSuccessRecoveryPhraseVerification } from './useSuccessRecoveryPhraseVerification';

export const SuccessRecoveryPhraseVerification = () => {
  const { title, body, image, buttonText, buttonAction } =
    useSuccessRecoveryPhraseVerification();

  return (
    <StatusSheetTemplate
      title={title}
      body={body}
      icon={{ name: image, variant: 'solid' }}
      buttonText={buttonText}
      buttonAction={buttonAction}
    />
  );
};

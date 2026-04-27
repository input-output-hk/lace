import { ClaimError as ClaimErrorTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useClaimError } from './useClaimError';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

export const ClaimError = (props: StackScreenProps<StackRoutes.ClaimError>) => {
  const {
    error,
    errorMessage,
    errorCode,
    iconSize,
    title,
    errorLabel,
    dismissLabel,
    onDismiss,
  } = useClaimError(props);

  if (!error) {
    return null;
  }

  return (
    <ClaimErrorTemplate
      title={title}
      errorMessage={errorMessage}
      errorLabel={errorLabel}
      errorCode={errorCode}
      iconSize={iconSize}
      dismissLabel={dismissLabel}
      onDismiss={onDismiss}
    />
  );
};

import { ClaimSuccess as ClaimSuccessTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useClaimSuccess } from './useClaimSuccess';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

export const ClaimSuccess = (
  props: StackScreenProps<StackRoutes.ClaimSuccess>,
) => {
  const {
    claimResponse,
    adaBalance,
    adaLogo,
    shouldShowViewTransactionButton,
    tokens,
    title,
    description,
    viewTransactionLabel,
    doneLabel,
    onViewTransaction,
    onDone,
  } = useClaimSuccess(props);

  if (!claimResponse) {
    return null;
  }

  return (
    <ClaimSuccessTemplate
      title={title}
      description={description}
      adaBalance={adaBalance}
      adaLogo={adaLogo}
      tokens={tokens}
      shouldShowViewTransactionButton={shouldShowViewTransactionButton}
      viewTransactionLabel={viewTransactionLabel}
      doneLabel={doneLabel}
      onViewTransaction={onViewTransaction}
      onDone={onDone}
    />
  );
};

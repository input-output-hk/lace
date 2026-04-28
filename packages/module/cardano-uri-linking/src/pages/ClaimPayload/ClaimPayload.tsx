import { ClaimPayload as ClaimPayloadTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useClaimPayload } from './useClaimPayload';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

export const ClaimPayload = (
  props: StackScreenProps<StackRoutes.ClaimPayload>,
) => {
  const {
    isLoading,
    domain,
    description,
    cancelLabel,
    ctaLabel,
    dropdownItems,
    selectedAccountId,
    selectedAccountName,
    onSelectAccount,
    onCancel,
    onSubmit,
  } = useClaimPayload(props);

  if (!domain) {
    return null;
  }

  return (
    <ClaimPayloadTemplate
      domain={domain}
      description={description}
      cancelLabel={cancelLabel}
      ctaLabel={ctaLabel}
      isLoading={isLoading}
      dropdownItems={dropdownItems}
      selectedAccountId={selectedAccountId}
      selectedAccountName={selectedAccountName}
      onSelectAccount={onSelectAccount}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
};

import { OnboardingHardwareWalletSetup } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useOnboardingHardwareSetup } from './useOnboardingHardwareSetup';

import type { StackScreenProps, StackRoutes } from '@lace-lib/navigation';

export const OnboardingHardwareSetup = (
  props: StackScreenProps<StackRoutes.OnboardingHardwareSetup>,
) => {
  const {
    title,
    onBackPress,
    accountIndex,
    setAccountIndex,
    accountLabel,
    derivationTypeOptions,
    derivationType,
    handleDerivationTypeChange,
    derivationTypeLabel,
    onCreateWallet,
    createButtonLabel,
    isCreating,
    error,
  } = useOnboardingHardwareSetup(props);

  return (
    <OnboardingHardwareWalletSetup
      title={title}
      onBackPress={onBackPress}
      accountIndex={accountIndex}
      onAccountIndexChange={setAccountIndex}
      accountLabel={accountLabel}
      derivationTypeOptions={derivationTypeOptions}
      derivationType={derivationType}
      onDerivationTypeChange={handleDerivationTypeChange}
      derivationTypeLabel={derivationTypeLabel}
      onCreateWallet={onCreateWallet}
      createButtonLabel={createButtonLabel}
      isLoading={isCreating}
      error={error}
    />
  );
};

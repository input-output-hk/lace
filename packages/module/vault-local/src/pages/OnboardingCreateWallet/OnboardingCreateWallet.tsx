import { OnboardingCreateWallet as OnboardingCreateWalletTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useOnboardingCreateWallet } from './useOnboardingCreateWallet';

import type { StackScreenProps, StackRoutes } from '@lace-lib/navigation';

export const OnboardingCreateWallet = (
  props: StackScreenProps<StackRoutes.OnboardingCreateWallet>,
) => {
  const {
    theme,
    title,
    subtitle,
    accounts,
    onAccountToggle,
    onFinishSetup,
    finishButtonLabel,
    onBackPress,
    isFinishDisabled,
    isFinishLoading,
    isAccountSelectionDisabled,
  } = useOnboardingCreateWallet(props);

  return (
    <OnboardingCreateWalletTemplate
      title={title}
      subtitle={subtitle}
      accounts={accounts}
      onAccountToggle={onAccountToggle}
      onFinishSetup={onFinishSetup}
      onBackPress={onBackPress}
      finishButtonLabel={finishButtonLabel}
      theme={theme}
      isFinishDisabled={isFinishDisabled}
      isFinishLoading={isFinishLoading}
      isAccountSelectionDisabled={isAccountSelectionDisabled}
    />
  );
};

import { WalletSetupSelectAccountsStep } from '@lace/core';
import React, { VFC } from 'react';
import { useHardwareWallet } from '@views/browser/components/WalletOnboardingFlows/hardware-wallet/context';
import { useAnalyticsContext } from '@providers';
import { useWalletOnboarding } from '../../walletOnboardingContext';

const TOTAL_ACCOUNTS = 50;

export const Setup: VFC = () => {
  const analytics = useAnalyticsContext();
  const { postHogActions } = useWalletOnboarding();
  const { back, next, onNameAndAccountChange } = useHardwareWallet();
  return (
    <WalletSetupSelectAccountsStep
      accounts={TOTAL_ACCOUNTS}
      onBack={back}
      onSubmit={(accountIndex, name) => {
        void analytics.sendEventToPostHog(postHogActions.hardware.ENTER_WALLET);
        onNameAndAccountChange({ accountIndex, name });
        next();
      }}
      onSelectedAccountChange={() => {
        void analytics.sendEventToPostHog(postHogActions.hardware.SETUP_HW_ACCOUNT_NO_CLICK);
      }}
    />
  );
};

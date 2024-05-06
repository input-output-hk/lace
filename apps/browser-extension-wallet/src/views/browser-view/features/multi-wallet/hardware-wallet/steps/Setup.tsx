import { WalletSetupSelectAccountsStepRevamp } from '@lace/core';
import { postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import React, { VFC } from 'react';
import { useHardwareWallet } from '@views/browser/features/multi-wallet/hardware-wallet/context';
import { useAnalyticsContext } from '@providers';

const TOTAL_ACCOUNTS = 50;

export const Setup: VFC = () => {
  const analytics = useAnalyticsContext();
  const { back, next, onNameAndAccountChange } = useHardwareWallet();
  return (
    <WalletSetupSelectAccountsStepRevamp
      accounts={TOTAL_ACCOUNTS}
      onBack={back}
      onSubmit={(accountIndex, name) => {
        void analytics.sendEventToPostHog(postHogOnboardingActions.hw.ENTER_WALLET);
        onNameAndAccountChange({ accountIndex, name });
        next();
      }}
      onSelectedAccountChange={() => {
        void analytics.sendEventToPostHog(postHogOnboardingActions.hw.SETUP_HW_ACCOUNT_NO_CLICK);
      }}
    />
  );
};

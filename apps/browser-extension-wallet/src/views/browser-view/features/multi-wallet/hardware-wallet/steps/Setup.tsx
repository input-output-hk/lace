import { WalletSetupSelectAccountsStepRevamp } from '@lace/core';
import React, { VFC, useState } from 'react';
import { useHardwareWallet } from '@views/browser/features/multi-wallet/hardware-wallet/context';
import { useAnalyticsContext } from '@providers';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { TrezorDerivationTypeSelector } from '@src/components/TrezorDerivationTypeSelector';
import { WalletType } from '@cardano-sdk/web-extension';
import { DerivationType } from '@lace/cardano';

const TOTAL_ACCOUNTS = 50;

export const Setup: VFC = () => {
  const analytics = useAnalyticsContext();
  const { postHogActions } = useWalletOnboarding();
  const { back, next, onNameAndAccountChange, connection } = useHardwareWallet();
  const [derivationType, setDerivationType] = useState<DerivationType>('ICARUS');

  const isTrezorDevice = connection?.type === WalletType.Trezor;

  return (
    <WalletSetupSelectAccountsStepRevamp
      accounts={TOTAL_ACCOUNTS}
      onBack={back}
      onSubmit={(accountIndex, name) => {
        void analytics.sendEventToPostHog(postHogActions.hardware.ENTER_WALLET);
        onNameAndAccountChange({ accountIndex, name, derivationType });
        next();
      }}
      onSelectedAccountChange={() => {
        void analytics.sendEventToPostHog(postHogActions.hardware.SETUP_HW_ACCOUNT_NO_CLICK);
      }}
      contentBeforeAccountSelector={
        isTrezorDevice ? (
          <TrezorDerivationTypeSelector value={derivationType} onChange={setDerivationType} />
        ) : undefined
      }
    />
  );
};

import React from 'react';
import { Setup } from './steps/Setup';
import { RestoreRecoveryPhrase } from './steps/RestoreRecoveryPhrase';
import { RestoreWalletProvider } from './context';
import { WalletRestoreStep } from './types';

export const RestoreWallet = (): JSX.Element => (
  <RestoreWalletProvider>
    {({ step }) => (
      <>
        {step === WalletRestoreStep.RecoveryPhrase && <RestoreRecoveryPhrase />}
        {step === WalletRestoreStep.Setup && <Setup />}
      </>
    )}
  </RestoreWalletProvider>
);

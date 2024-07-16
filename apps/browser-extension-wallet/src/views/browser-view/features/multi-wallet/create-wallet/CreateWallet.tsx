import React from 'react';
import { Setup } from './steps/Setup';
import { NewRecoveryPhrase } from './steps/NewRecoveryPhrase';
import { CreateWalletProvider } from './context';
import { WalletCreateStep } from './types';

export const CreateWallet = (): JSX.Element => (
  <CreateWalletProvider>
    {({ step }) => (
      <>
        {(step === WalletCreateStep.RecoveryPhraseWriteDown || step === WalletCreateStep.RecoveryPhraseInput) && (
          <NewRecoveryPhrase />
        )}
        {step === WalletCreateStep.Setup && <Setup />}
      </>
    )}
  </CreateWalletProvider>
);

import React from 'react';
import { Setup } from './steps/Setup';
import { NewRecoveryPhrase } from './steps/NewRecoveryPhrase';
import { CreateWalletProvider } from './context';
import { WalletCreateStep } from './types';
import { ChooseRecoveryMethod } from './steps/ChooseRecoveryMethod';
import { SecurePaperWallet } from './steps/SecurePaperWallet';
import { SavePaperWallet } from './steps/SavePaperWallet';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

export const CreateWallet = (): JSX.Element => {
  const posthog = usePostHogClientContext();
  const paperWalletEnabled = posthog?.featureFlags?.['create-paper-wallet'] === true;

  return (
    <CreateWalletProvider>
      {({ step }) => {
        switch (step) {
          // Paper wallet steps
          case WalletCreateStep.ChooseRecoveryMethod:
            return <ChooseRecoveryMethod />;
          case WalletCreateStep.SecurePaperWallet:
            return <SecurePaperWallet />;
          case WalletCreateStep.SavePaperWallet:
            return <SavePaperWallet />;
          // Legacy steps
          case WalletCreateStep.RecoveryPhraseWriteDown:
          case WalletCreateStep.RecoveryPhraseInput:
            return <NewRecoveryPhrase paperWalletEnabled={paperWalletEnabled} />;
          // Common steps
          case WalletCreateStep.Setup:
            return <Setup />;
          default:
            return <ChooseRecoveryMethod />;
        }
      }}
    </CreateWalletProvider>
  );
};

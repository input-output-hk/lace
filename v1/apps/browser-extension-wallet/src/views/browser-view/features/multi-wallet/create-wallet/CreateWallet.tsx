import React from 'react';
import { Setup } from './steps/Setup';
import { NewRecoveryPhrase } from './steps/NewRecoveryPhrase';
import { CreateWalletProvider } from './context';
import { WalletCreateStep } from './types';
import { ChooseRecoveryMethod } from './steps/ChooseRecoveryMethod';
import { SecurePaperWallet } from './steps/SecurePaperWallet';
import { SavePaperWallet } from './steps/SavePaperWallet';
import { SelectBlockchain } from './steps/SelectBlockchain';
import { ReuseRecoveryPhrase } from './steps/ReuseRecoveryPhrase';
import { EnterWalletPassword } from './steps/EnterWalletPassword';
import { RecoveryPhraseError } from './steps/RecoveryPhraseError';

export const CreateWallet = (): JSX.Element => (
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
          return <NewRecoveryPhrase />;
        case WalletCreateStep.ReuseRecoveryPhrase:
          return <ReuseRecoveryPhrase />;
        case WalletCreateStep.EnterWalletPassword:
          return <EnterWalletPassword />;
        case WalletCreateStep.RecoveryPhraseError:
          return <RecoveryPhraseError />;
        // Common steps
        case WalletCreateStep.Setup:
          return <Setup />;
        case WalletCreateStep.SelectBlockchain:
          return <SelectBlockchain />;
        default:
          return <ChooseRecoveryMethod />;
      }
    }}
  </CreateWalletProvider>
);

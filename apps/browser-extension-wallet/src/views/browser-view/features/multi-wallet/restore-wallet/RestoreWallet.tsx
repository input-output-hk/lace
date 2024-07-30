import React from 'react';
import { Setup } from './steps/Setup';
import { RestoreRecoveryPhrase } from './steps/RestoreRecoveryPhrase';
import { RestoreWalletProvider } from './context';
import { WalletRestoreStep } from './types';
import { ChooseRestoreMethod } from './steps/ChooseRestoreMethod';
import { ScanShieldedMessage } from './steps/ScanShieldedMessage';
import { EnterPgpPrivateKey } from './steps/EnterPgpPrivateKey';
import { WalletOverview } from './steps/WalletOverview';

export const RestoreWallet = (): JSX.Element => (
  <RestoreWalletProvider>
    {({ step }) => {
      switch (step) {
        // Paper wallet seteps
        case WalletRestoreStep.ChooseRecoveryMethod:
          return <ChooseRestoreMethod />;
        case WalletRestoreStep.ScanQrCode:
          return <ScanShieldedMessage />;
        case WalletRestoreStep.SummaryWalletInfo:
          return <WalletOverview />;
        case WalletRestoreStep.PrivatePgpKeyEntry:
          return <EnterPgpPrivateKey />;
        // Legacy steps
        case WalletRestoreStep.RecoveryPhrase:
          return <RestoreRecoveryPhrase />;
        // Common steps
        case WalletRestoreStep.Setup:
          return <Setup />;
        default:
          return <ChooseRestoreMethod />;
      }
    }}
  </RestoreWalletProvider>
);

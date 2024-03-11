import { WalletSetupSteps, WalletSetupWizard } from './wallet-steps.common';

export const walletSetupWizard: WalletSetupWizard = {
  [WalletSetupSteps.Mnemonic]: {
    next: WalletSetupSteps.Register
  },
  [WalletSetupSteps.Register]: {
    prev: WalletSetupSteps.Mnemonic
  }
};

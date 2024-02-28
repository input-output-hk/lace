import { WalletSetupSteps, WalletSetupWizard } from './wallet-steps.common';

export const walletSetupWizard: WalletSetupWizard = {
  [WalletSetupSteps.Legal]: {
    next: WalletSetupSteps.Analytics
  },
  [WalletSetupSteps.Analytics]: {
    prev: WalletSetupSteps.Legal,
    next: WalletSetupSteps.Register
  },
  [WalletSetupSteps.Register]: {
    prev: WalletSetupSteps.Analytics,
    next: WalletSetupSteps.Password
  },
  [WalletSetupSteps.Password]: {
    prev: WalletSetupSteps.Register,
    next: WalletSetupSteps.RecoveryPhraseLength
  },
  [WalletSetupSteps.RecoveryPhraseLength]: {
    prev: WalletSetupSteps.Password,
    next: WalletSetupSteps.Mnemonic
  },
  [WalletSetupSteps.Mnemonic]: {
    prev: WalletSetupSteps.Password,
    next: WalletSetupSteps.Create
  },
  [WalletSetupSteps.Create]: {
    prev: WalletSetupSteps.Mnemonic
  }
};

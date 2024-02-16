import { WalletSetupSteps, WalletSetupWizard } from './wallet-steps.common';

export const walletSetupWizard: WalletSetupWizard = {
  [WalletSetupSteps.Register]: {
    next: WalletSetupSteps.RecoveryPhraseLength
  },
  [WalletSetupSteps.RecoveryPhraseLength]: {
    prev: WalletSetupSteps.Register,
    next: WalletSetupSteps.Mnemonic
  },
  [WalletSetupSteps.Mnemonic]: {
    prev: WalletSetupSteps.RecoveryPhraseLength,
    next: WalletSetupSteps.Create
  },
  [WalletSetupSteps.Create]: {
    prev: WalletSetupSteps.Mnemonic
  }
};

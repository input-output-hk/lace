import { WalletSetupStepsRevamp, WalletSetupWizardRevamp } from './wallet-steps-revamp.common';

export const walletSetupWizardRevamp: WalletSetupWizardRevamp = {
  [WalletSetupStepsRevamp.Register]: {
    next: WalletSetupStepsRevamp.RecoveryPhraseLength
  },
  [WalletSetupStepsRevamp.RecoveryPhraseLength]: {
    prev: WalletSetupStepsRevamp.Register,
    next: WalletSetupStepsRevamp.Mnemonic
  },
  [WalletSetupStepsRevamp.Mnemonic]: {
    prev: WalletSetupStepsRevamp.RecoveryPhraseLength,
    next: WalletSetupStepsRevamp.Create
  },
  [WalletSetupStepsRevamp.Create]: {
    prev: WalletSetupStepsRevamp.Mnemonic,
    next: WalletSetupStepsRevamp.Finish
  },
  [WalletSetupStepsRevamp.Finish]: {
    prev: WalletSetupStepsRevamp.Create
  }
};

import { WalletSetupStepsRevamp, WalletSetupWizardRevamp } from './wallet-steps-revamp.common';

export const walletSetupWizardRevamp: WalletSetupWizardRevamp = {
  [WalletSetupStepsRevamp.Register]: {
    next: WalletSetupStepsRevamp.Password
  },
  [WalletSetupStepsRevamp.Password]: {
    prev: WalletSetupStepsRevamp.Register,
    next: WalletSetupStepsRevamp.RecoveryPhraseLength
  },
  [WalletSetupStepsRevamp.RecoveryPhraseLength]: {
    prev: WalletSetupStepsRevamp.Password,
    next: WalletSetupStepsRevamp.Mnemonic
  },
  [WalletSetupStepsRevamp.PreMnemonic]: {
    prev: WalletSetupStepsRevamp.Password,
    next: WalletSetupStepsRevamp.Mnemonic
  },
  [WalletSetupStepsRevamp.Mnemonic]: {
    prev: WalletSetupStepsRevamp.PreMnemonic,
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

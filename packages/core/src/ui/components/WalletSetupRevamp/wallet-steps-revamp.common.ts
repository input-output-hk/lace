export enum WalletSetupStepsRevamp {
  Mode = 'mode',
  PreMnemonic = 'pre-mnemonic',
  Mnemonic = 'mnemonic',
  Register = 'register',
  Password = 'password',
  RecoveryPhraseLength = 'recovery-phrase-length',
  Create = 'create',
  Finish = 'finish'
}

type WizardItem = {
  prev?: WalletSetupStepsRevamp;
  next?: WalletSetupStepsRevamp;
};

export type WalletSetupWizardRevamp = {
  [key in WalletSetupStepsRevamp]?: WizardItem;
};

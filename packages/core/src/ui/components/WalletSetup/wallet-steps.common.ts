export enum WalletSetupSteps {
  Legal = 'legal',
  Analytics = 'analytics',
  Mode = 'mode',
  Mnemonic = 'mnemonic',
  Register = 'register',
  Password = 'password',
  RecoveryPhraseLength = 'recovery-phrase-length',
  Create = 'create',
  Finish = 'finish'
}

type WizardItem = {
  prev?: WalletSetupSteps;
  next?: WalletSetupSteps;
};

export type WalletSetupWizard = {
  [key in WalletSetupSteps]?: WizardItem;
};

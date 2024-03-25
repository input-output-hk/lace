export enum WalletSetupSteps {
  Mode = 'mode',
  Mnemonic = 'mnemonic',
  Register = 'register',
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

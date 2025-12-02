export enum WalletCreateStep {
  // Legacy
  RecoveryPhraseInput = 'RecoveryPhraseInput',
  RecoveryPhraseWriteDown = 'RecoveryPhraseWriteDown',
  ReuseRecoveryPhrase = 'ReuseRecoveryPhrase',
  EnterWalletPassword = 'EnterWalletPassword',
  RecoveryPhraseError = 'RecoveryPhraseError',
  // Paper wallet
  ChooseRecoveryMethod = 'ChooseRecoveryMethod',
  SecurePaperWallet = 'SecurePaperWallet',
  SavePaperWallet = 'SavePaperWallet',
  // Common
  Setup = 'Setup',
  SelectBlockchain = 'SelectBlockchain'
}

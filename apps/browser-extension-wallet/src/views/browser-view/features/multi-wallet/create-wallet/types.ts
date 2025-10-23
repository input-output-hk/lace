export enum WalletCreateStep {
  // Legacy
  RecoveryPhraseInput = 'RecoveryPhraseInput',
  RecoveryPhraseWriteDown = 'RecoveryPhraseWriteDown',
  // Paper wallet
  ChooseRecoveryMethod = 'ChooseRecoveryMethod',
  SecurePaperWallet = 'SecurePaperWallet',
  SavePaperWallet = 'SavePaperWallet',
  // Common
  Setup = 'Setup',
  SelectBlockchain = 'SelectBlockchain'
}

export enum WalletRestoreStep {
  // Legacy
  RecoveryPhrase = 'RecoveryPhrase',
  // Paper wallet
  ChooseRecoveryMethod = 'ChooseRecoveryMethod',
  ScanQrCode = 'ScanQrCode',
  SummaryWalletInfo = 'SummaryWalletInfo',
  PrivatePgpKeyEntry = 'PrivatePgpKeyEntry',
  // Common
  Setup = 'Setup',
  SelectBlockchain = 'SelectBlockchain'
}

import { Subject } from 'rxjs';

export interface Providers {
  generateMnemonicWords: () => string[];
  shouldShowConfirmationDialog$: Subject<boolean>;
}

export enum WalletCreateStep {
  // Legacy
  RecoveryPhraseInput = 'RecoveryPhraseInput',
  RecoveryPhraseWriteDown = 'RecoveryPhraseWriteDown',
  // Paper wallet
  ChooseRecoveryMethod = 'ChooseRecoveryMethod',
  SecurePaperWallet = 'SecurePaperWallet',
  SavePaperWallet = 'SavePaperWallet',
  // Common
  Setup = 'Setup'
}

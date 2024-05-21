import { Subject } from 'rxjs';

export interface Providers {
  generateMnemonicWords: () => string[];
  shouldShowConfirmationDialog$: Subject<boolean>;
}

export enum WalletCreateStep {
  RecoveryPhraseWriteDown = 'RecoveryPhraseWriteDown',
  RecoveryPhraseInput = 'RecoveryPhraseInput',
  Setup = 'Setup'
}

import { Subject } from 'rxjs';

export interface Providers {
  shouldShowConfirmationDialog$: Subject<boolean>;
}

export enum WalletRestoreStep {
  RecoveryPhrase = 'RecoveryPhrase',
  Setup = 'Setup'
}

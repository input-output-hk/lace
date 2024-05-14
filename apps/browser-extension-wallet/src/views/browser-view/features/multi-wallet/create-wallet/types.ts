import { Subject } from 'rxjs';

export interface Data {
  mnemonic: string[];
  name: string;
  password: string;
}

export interface Providers {
  generateMnemonicWords: () => string[];
  shouldShowConfirmationDialog$: Subject<boolean>;
}

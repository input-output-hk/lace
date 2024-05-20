import { Subject } from 'rxjs';

export interface Data {
  mnemonic: string[];
  length: number;
  name: string;
  password: string;
}

export interface Providers {
  shouldShowConfirmationDialog$: Subject<boolean>;
}

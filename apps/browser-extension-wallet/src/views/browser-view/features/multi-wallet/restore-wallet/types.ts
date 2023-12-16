import { Subject } from 'rxjs';

export interface Data {
  mnemonic: string[];
  length: number;
  name: string;
  password: string;
}

export interface Providers {
  createWallet: (params: Data) => Promise<void>;
  confirmationDialog: {
    shouldShowDialog$: Subject<boolean>;
    withConfirmationDialog: (callback: () => void) => () => void;
  };
}

import { Wallet } from '@lace/cardano';
import { Observable, Subject } from 'rxjs';

export interface Data {
  model: Wallet.HardwareWallets;
  connection: Wallet.DeviceConnection;
  account: number;
  name: string;
}

export interface Providers {
  createWallet: (params: Data) => Promise<void>;
  connectHardwareWallet: (model: Wallet.HardwareWallets) => Promise<Wallet.DeviceConnection>;
  disconnectHardwareWallet$: Observable<USBConnectionEvent>;
  shouldShowDialog$: Subject<boolean>;
}

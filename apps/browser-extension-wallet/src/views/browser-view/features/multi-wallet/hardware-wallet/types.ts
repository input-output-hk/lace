import { Wallet } from '@lace/cardano';
import { Observable } from 'rxjs';

export interface Data {
  model: Wallet.HardwareWallets;
  connection: Wallet.DeviceConnection;
  account: number;
  name: string;
}

export interface Providers {
  createWallet: (params: Data) => Promise<void>;
  connectHardwareWallet: (model: Wallet.HardwareWallets) => Promise<Wallet.DeviceConnection>;
  disconnectHardwareWallet$: Observable<HIDConnectionEvent>;
}

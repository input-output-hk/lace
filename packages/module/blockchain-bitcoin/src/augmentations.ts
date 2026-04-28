import type { bitcoinContextReducers } from './store';
import type { BitcoinWallet } from './wallet';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';
import type { BehaviorSubject } from 'rxjs';

export type BitcoinSideEffectsDependencies = {
  bitcoinAccountWallets$: BehaviorSubject<Record<string, BitcoinWallet>>;
};

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends BitcoinSideEffectsDependencies {}
  interface State
    extends StateFromReducersMapObject<typeof bitcoinContextReducers> {}
}

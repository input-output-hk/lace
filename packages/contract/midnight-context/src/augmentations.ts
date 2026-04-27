import type { MidnightSDKTestNetworkId } from './const';
import type { midnightContextReducers } from './store/slice';
import type {
  MidnightSideEffectsDependencies,
  MidnightSpecificInMemoryWalletData,
} from './types';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof midnightContextReducers> {}
  interface SideEffectDependencies extends MidnightSideEffectsDependencies {}
  interface AppConfig {
    defaultMidnightTestnetNetworkId: MidnightSDKTestNetworkId;
  }
}

declare module '@lace-contract/wallet-repo' {
  interface BlockchainSpecificInMemoryWalletData {
    Midnight?: MidnightSpecificInMemoryWalletData;
  }
}

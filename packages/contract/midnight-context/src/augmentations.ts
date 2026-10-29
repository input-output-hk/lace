import type { MidnightSDKTestNetworkId } from './const';
import type { MidnightWalletsByAccountId } from './midnight-wallet';
import type { midnightContextReducers } from './store/slice';
import type {
  MidnightSideEffectsDependencies,
  MidnightSpecificInMemoryWalletData,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof midnightContextReducers> {}
  interface SideEffectDependencies extends MidnightSideEffectsDependencies {}
  interface AppConfig {
    defaultMidnightTestnetNetworkId: MidnightSDKTestNetworkId;
  }
  interface LaceAddons {
    /** The running engine wallets of the loading app instance, keyed by account. */
    readonly loadMidnightEngine: DynamicallyLoadedInit<
      Observable<MidnightWalletsByAccountId>
    >;
  }
}

declare module '@lace-contract/wallet-repo' {
  interface BlockchainSpecificInMemoryWalletData {
    Midnight?: MidnightSpecificInMemoryWalletData;
  }
}

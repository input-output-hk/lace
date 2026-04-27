import type { networkReducers } from './store/slice';
import type { Cardano } from '@cardano-sdk/core';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface AppConfig {
    cexplorerUrls: Record<Cardano.NetworkMagic, string>;
    bitcoinExplorerUrls: Record<string, string>;
  }

  interface State extends StateFromReducersMapObject<typeof networkReducers> {}
}

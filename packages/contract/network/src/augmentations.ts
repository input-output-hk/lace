// The stable SDK build resolves augmentations.stable.ts in place of this file,
// whose config names only Cardano's explorers.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

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

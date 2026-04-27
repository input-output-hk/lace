import type { cardanoUriLinkingReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface AppConfig {
    nftCdnUrl: string;
  }
  interface State
    extends StateFromReducersMapObject<typeof cardanoUriLinkingReducers> {}
}

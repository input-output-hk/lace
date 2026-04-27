import type { midnightReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State extends StateFromReducersMapObject<typeof midnightReducers> {}
}

declare module '@lace-contract/module' {
  interface AppConfig {
    midnightFoundationTermsAndConditionsUrl: string;
    midnightGlobalTermsAndConditionsUrl: string;
    laceTermsOfUseUrl: string;
  }
}

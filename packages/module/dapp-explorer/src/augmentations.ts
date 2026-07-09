import type { CardanoCubeProvider } from './store/dependencies';
import type { dappCenterReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export type CardanoCubeProviderDependencies = {
  cardanoCubeProvider: CardanoCubeProvider;
};

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof dappCenterReducers> {}
  interface SideEffectDependencies extends CardanoCubeProviderDependencies {}
  interface AppConfig {
    cardanoCubeBaseUrl?: string;
  }
}

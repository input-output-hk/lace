import type { initializeBitcoinDappConnectorSideEffectDependencies } from './store/dependencies/dapp-connector';
import type { bitcoinDappConnectorReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

/**
 * Side effect dependencies contributed by the Bitcoin dApp connector module.
 */
export type BitcoinDappConnectorSideEffectDependencies = ReturnType<
  typeof initializeBitcoinDappConnectorSideEffectDependencies
>;

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof bitcoinDappConnectorReducers> {}

  interface SideEffectDependencies
    extends BitcoinDappConnectorSideEffectDependencies {}
}

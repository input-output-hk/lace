import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { viewsStoreContract } from '@lace-contract/views';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

/**
 * Backs the air-gapped QR exchange trigger with a redux-state-driven SW<->view
 * bridge (mirrors the authentication prompt). The SW side effect dispatches
 * pending state and surfaces the view; depends on the views store to open the
 * camera-capable scanner tab on the extension and to detect its disconnect.
 */
export const airGappedQrExchangeStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('air-gapped-qr-exchange-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([viewsStoreContract] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<
  typeof airGappedQrExchangeStoreContract
>;
export type ActionCreators = ContractActionCreators<
  typeof airGappedQrExchangeStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

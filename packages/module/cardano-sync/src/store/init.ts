import { createCoordinateCardanoSync } from '@lace-contract/cardano-context';

import { addressDiscoverySync } from './side-effects/address-discovery-sync';
import { manualAddressDiscoveryEnqueue } from './side-effects/manual-address-discovery';
import { monolithCardanoSyncConfig } from './side-effects/monolith-cardano-sync-config';
import { submitTxSideEffect } from './side-effects/submit-tx';
import { trackAccountUtxos } from './side-effects/track-account-utxos';
import { trackTip } from './side-effects/trackTip';

import type {
  AppConfig,
  LaceInit,
  LaceModuleStoreInit,
} from '@lace-contract/module';

export const createCardanoSyncSideEffects = (config: AppConfig) => [
  createCoordinateCardanoSync(monolithCardanoSyncConfig),
  addressDiscoverySync,
  manualAddressDiscoveryEnqueue,
  trackAccountUtxos,
  trackTip(config.cardanoProvider.tipPollFrequency),
  submitTxSideEffect,
];

const store: LaceInit<LaceModuleStoreInit> = props => ({
  sideEffects: createCardanoSyncSideEffects(props.runtime.config),
});

export default store;

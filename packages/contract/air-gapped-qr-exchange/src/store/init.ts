import { AIR_GAPPED_QR_SCAN_LOCATION } from '../const';

import { makeAirGappedQrExchangeSideEffect } from './side-effects';
import { airGappedQrExchangeReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = props => ({
  reducers: airGappedQrExchangeReducers,
  sideEffects: [
    makeAirGappedQrExchangeSideEffect({
      opensScannerTab: props.runtime.platform === 'web-extension',
      scannerLocation: AIR_GAPPED_QR_SCAN_LOCATION,
    }),
  ],
});

export default store;

export {
  airGappedQrExchangeActions,
  airGappedQrExchangeSelectors,
} from './slice';

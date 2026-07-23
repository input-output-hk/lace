import { inferStoreContext } from '@lace-contract/module';

import {
  airGappedQrExchangeActions,
  airGappedQrExchangeSelectors,
} from './slice';

export {
  airGappedQrExchangeActions,
  airGappedQrExchangeSelectors,
  airGappedQrExchangeReducers,
} from './slice';

export type {
  PendingAirGappedQrExchange,
  AirGappedQrExchangeSliceState,
  AirGappedQrExchangeStoreState,
} from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: airGappedQrExchangeActions,
    selectors: airGappedQrExchangeSelectors,
  },
});

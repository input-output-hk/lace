import { inferStoreContext } from '@lace-contract/module';

import { cardanoContextSelectors } from '../../store/slice';
import { cardanoCustodyBuildActions } from '../build-actions';

import { createCardanoCustodySelectors } from './selectors';

const core = cardanoContextSelectors.cardanoContext;

/** The custody account actions: custody builds and creator index probes. */
export const cardanoCustodyActions = {
  cardanoCustody: cardanoCustodyBuildActions,
};

/** The custody account selectors, by scope. */
export const cardanoCustodySelectors = {
  cardanoCustody: createCardanoCustodySelectors({
    selectAccountUtxos: core.selectAccountUtxos,
    selectAccountUtxosWithInFlight: core.selectAccountUtxosWithInFlight,
    selectAllNetworkInfo: core.selectAllNetworkInfo,
    selectEraSummaries: core.selectEraSummaries,
    selectRewardAccountDetails: core.selectRewardAccountDetails,
    selectTip: core.selectTip,
  }),
};

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: cardanoCustodyActions,
    selectors: cardanoCustodySelectors,
  },
});

import { inferStoreContext } from '@lace-contract/module';

import { walletsActions, walletsSelectors } from './lace-context';

export * from './lace-context';
export { isAccountVisibleOnNetwork } from './utils';
export type { BlockchainNetworks } from './utils';
export type { WalletsState } from './init';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: walletsActions,
    selectors: walletsSelectors,
  },
});

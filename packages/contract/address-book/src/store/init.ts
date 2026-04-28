import { BlockchainNetworkId } from '@lace-contract/network';
import { createMigrate } from 'redux-persist';

import { addressBookReducers } from './slice';

import type { AddressBookSliceState } from './slice';
import type {
  LaceInit,
  LaceModuleStoreInit,
  PersistedState,
} from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: addressBookReducers,
  persistConfig: {
    addressBook: {
      version: 2,
      migrate: createMigrate({
        2: state => {
          const typedState = state as PersistedState<AddressBookSliceState>;
          for (const contact of Object.values(typedState.contacts)) {
            contact.aliases = contact.aliases || [];
            for (const address of contact.addresses) {
              address.network = BlockchainNetworkId(
                address.blockchainName === 'Cardano'
                  ? 'cardano-1'
                  : 'bitcoin-testnet4',
              );
            }
          }
          return typedState;
        },
      }),
    },
  },
});

export default store;

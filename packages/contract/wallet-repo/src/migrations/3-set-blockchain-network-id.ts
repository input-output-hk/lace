import { BlockchainNetworkId } from '@lace-contract/network';

import type { WalletsState } from '../store';
import type { PersistedState } from '@lace-contract/module';
import type { BlockchainName } from '@lace-lib/util-store';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

const migrateBlockchainNetworkId = (
  blockchainName: BlockchainName,
): BlockchainNetworkId => {
  // Lace v2 is pre-release and this migration is intended to be performed with testnet accounts only
  // It's ok to have this hidden coupling in the migration, as it doesn't need to be ever updated,
  // even if we change the format of network IDs or add more.
  switch (blockchainName) {
    case 'Cardano':
      return BlockchainNetworkId('cardano-1'); // preprod
    case 'Midnight':
      return BlockchainNetworkId('midnight-preview');
    case 'Bitcoin':
      return BlockchainNetworkId('bitcoin-testnet4');
  }
};

export const setBlockchainNetworkId = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<WalletsState['wallets']>;
  if (!typedState.entities) return typedState;
  for (const wallet of Object.values(typedState.entities)) {
    for (const account of wallet.accounts) {
      account.blockchainNetworkId = migrateBlockchainNetworkId(
        account.blockchainName,
      );
    }
  }
  return typedState;
};

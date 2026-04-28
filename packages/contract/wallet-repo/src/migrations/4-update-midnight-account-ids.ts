import { AccountId } from '../value-objects';

import type { WalletsState } from '../store';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

export const updateMidnightAccountIds = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<WalletsState['wallets']>;
  if (!typedState.entities) return typedState;
  for (const wallet of Object.values(typedState.entities)) {
    for (const account of wallet.accounts) {
      if (account.blockchainName === 'Midnight') {
        const networkId = (account.blockchainSpecific as { networkId: string })
          .networkId;
        account.accountId = AccountId(`${wallet.walletId}-mn-0-${networkId}`);
      }
    }
  }
  if (typedState.activeAccountContext?.accountId.endsWith('-mn')) {
    typedState.activeAccountContext = null;
  }
  return typedState;
};

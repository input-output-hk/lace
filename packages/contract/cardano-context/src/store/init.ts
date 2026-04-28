import {
  isReduxPersistState,
  type LaceInit,
  type LaceModuleStoreInit,
  type PersistedStateProperty,
} from '@lace-contract/module';
import { createMigrate, createTransform } from 'redux-persist';

import {
  cardanoAccountUnspendableUtxos$,
  cardanoAccountUtxos$,
  cardanoAddresses$,
  cardanoChainId$,
  cardanoNetworkMagic$,
  cardanoProtocolParameters$,
  cardanoRewardAccountDetails$,
} from '../cardano-observables';

import {
  deleteProtocolParameters,
  deleteStakePoolsData,
  deleteStakePoolsSystem,
} from './migrations';
import { createCardanoProviderSideEffects } from './side-effects';
import { cardanoContextReducers, initialState } from './slice';

import type { CardanoAccountId } from '../value-objects';
import type { CardanoContextSliceState } from './slice';
import type {
  CardanoAccountAddressHistoryMap,
  CardanoAddressTransactionHistoryMap,
  CardanoPaymentAddress,
} from '../types';
import type { AccountId } from '@lace-contract/wallet-repo';

export const MAX_TRANSACTIONS_PER_ACCOUNT = 20;

export const accountTransactionHistoryTransform = createTransform<
  PersistedStateProperty<CardanoContextSliceState>,
  PersistedStateProperty<CardanoContextSliceState>
>((inboundState, key) => {
  if (isReduxPersistState(key, inboundState)) {
    return inboundState;
  }

  if (key === 'accountTransactionHistory') {
    const inboundHistory =
      inboundState as unknown as CardanoAccountAddressHistoryMap;
    const outboundState: CardanoAccountAddressHistoryMap = {};

    for (const accountId in inboundHistory) {
      const accountHistory = inboundHistory[accountId as CardanoAccountId];
      const newAccountHistory: CardanoAddressTransactionHistoryMap = {};

      for (const [address, addressHistory] of Object.entries(accountHistory)) {
        // assume that the transactions are sorted by block time in descending order
        const latestAccountTransactions = [
          ...addressHistory.transactionHistory,
        ].slice(0, MAX_TRANSACTIONS_PER_ACCOUNT);

        newAccountHistory[address as CardanoPaymentAddress] = {
          transactionHistory: latestAccountTransactions,
          hasLoadedOldestEntry:
            addressHistory.transactionHistory.length >
            MAX_TRANSACTIONS_PER_ACCOUNT
              ? false
              : addressHistory.hasLoadedOldestEntry,
        };
      }

      outboundState[accountId as AccountId] = newAccountHistory;
    }

    return outboundState;
  }

  return inboundState;
});

const store: LaceInit<LaceModuleStoreInit> = ({ runtime: { config } }) => ({
  sideEffects: createCardanoProviderSideEffects(config),
  reducers: cardanoContextReducers,
  preloadedState: {
    cardanoContext: initialState,
  },
  sideEffectDependencies: {
    txExecutorCardano: {
      cardanoProtocolParameters$,
      cardanoNetworkMagic$,
      cardanoAccountUtxos$,
      cardanoAccountUnspendableUtxos$,
      cardanoAddresses$,
      cardanoChainId$,
      cardanoRewardAccountDetails$,
    },
  },
  persistConfig: {
    cardanoContext: {
      version: 4,
      whitelist: [
        'accountTransactionHistory',
        'accountRewardsHistory',
        'networkInfo',
      ],
      migrate: createMigrate({
        2: deleteStakePoolsData,
        3: deleteProtocolParameters,
        4: deleteStakePoolsSystem,
      }),
      transforms: [accountTransactionHistoryTransform],
    },
  },
});

export default store;

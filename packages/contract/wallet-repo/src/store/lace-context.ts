import { markParameterizedSelector } from '@lace-contract/module';
import { networkSelectors } from '@lace-contract/network';
import omit from 'lodash/omit';
import uniq from 'lodash/uniq';
import { createSelector } from 'reselect';

import { repositoryAdapter, repositorySlice } from './repo-slice';

import type { AnyAccount } from '../types';
import type { State } from '@lace-contract/module';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { BlockchainName } from '@lace-lib/util-store';

const repositorySelectors = omit(
  repositoryAdapter.getSelectors<State>(state => state.wallets),
  'selectById',
);

const selectIsWalletRepoMigrating = (state: State) =>
  state.wallets.isWalletRepoMigrating;

const selectActiveNetworkAccounts = createSelector(
  repositorySelectors.selectAll,
  networkSelectors.network.selectAllActiveNetworkIds,
  (wallets, activeNetworkIds) =>
    wallets.flatMap((w): AnyAccount[] =>
      w.accounts.filter(account =>
        activeNetworkIds.includes(account.blockchainNetworkId),
      ),
    ),
);

const selectActiveNetworkAccountsByBlockchainName = markParameterizedSelector(
  createSelector(
    selectActiveNetworkAccounts,
    (_state: State, params: { blockchainName: BlockchainName }) => params,
    (accounts, { blockchainName }) =>
      accounts.filter(account => account.blockchainName === blockchainName),
  ),
);

const selectActiveNetworkWallets = createSelector(
  repositorySelectors.selectAll,
  selectActiveNetworkAccounts,
  (wallets, accounts) => {
    const visibleWalletIds = new Set(accounts.map(account => account.walletId));
    return wallets.filter(wallet => visibleWalletIds.has(wallet.walletId));
  },
);

const selectActiveBlockchains = createSelector(
  selectActiveNetworkAccounts,
  allAccounts => uniq(allAccounts.map(account => account.blockchainName)),
);

/** Display names of all accounts on the given blockchain network. */
const selectAccountNamesByNetworkId = markParameterizedSelector(
  createSelector(
    repositorySelectors.selectAll,
    (_state: State, networkId?: BlockchainNetworkId) => networkId,
    (wallets, networkId) => {
      if (!networkId) return [];
      return wallets.flatMap(wallet =>
        wallet.accounts
          .filter(account => account.blockchainNetworkId === networkId)
          .map(account => account.metadata.name),
      );
    },
  ),
);

const selectAccountById = markParameterizedSelector(
  createSelector(
    repositorySelectors.selectAll,
    (_state: State, params: { accountId: string; walletId: string }) => params,
    (wallets, { accountId, walletId }) => {
      const wallet = wallets.find(w => w.walletId === walletId);
      if (!wallet) return undefined;

      return wallet.accounts.find(account => account.accountId === accountId);
    },
  ),
);

const selectActiveNetworkAccountCountByWalletId = markParameterizedSelector(
  createSelector(
    selectActiveNetworkAccounts,
    (_: unknown, walletId: string) => walletId,
    (accounts, walletId) =>
      accounts.filter(account => account.walletId === walletId).length,
  ),
);

const selectWalletById = markParameterizedSelector(
  createSelector(
    repositorySelectors.selectAll,
    (_: unknown, walletId: string) => walletId,
    (wallets, walletId) => wallets.find(w => w.walletId === walletId),
  ),
);

const selectActiveAccountContext = (state: State) =>
  state.wallets.activeAccountContext;

/** Direct import of this is an anti-pattern. OK for tests. */
export const walletsSelectors = {
  wallets: {
    ...repositorySelectors,
    selectActiveNetworkWallets,
    selectActiveNetworkAccounts,
    selectActiveNetworkAccountsByBlockchainName,
    selectActiveBlockchains,
    selectAccountNamesByNetworkId,
    selectAccountById,
    selectActiveNetworkAccountCountByWalletId,
    selectWalletById,
    selectActiveAccountContext,
    selectIsWalletRepoMigrating,
  },
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const walletsActions = { wallets: repositorySlice.actions };

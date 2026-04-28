import { markParameterizedSelector } from '@lace-contract/module';
import { walletsActions, walletsSelectors } from '@lace-contract/wallet-repo';
import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { Address, AnyAddress, AnyBlockchainAddress } from '../types';
import type { AddressAlias, AddressAliasType } from '../value-objects';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BlockchainAssigned } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type UpsertAddressesPayload = BlockchainAssigned<{
  addresses: AnyBlockchainAddress[];
  accountId: AccountId;
}>;

export type ResetAddressesPayload = {
  accountId: AccountId;
};

export type AddressAliasEntry = {
  address: Address;
  aliasType: AddressAliasType;
  alias: AddressAlias;
};

export type SetAliasesPayload = {
  aliases: ReadonlyArray<AddressAliasEntry>;
};

export type AddressesSliceState = {
  addresses: AnyAddress[];
  aliases: Partial<Record<Address, AddressAliasEntry[]>>;
};

const initialState: AddressesSliceState = {
  addresses: [],
  aliases: {},
};

const slice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    upsertAddresses: (
      state,
      { payload }: Readonly<PayloadAction<UpsertAddressesPayload>>,
    ) => {
      const newAddresses = payload.addresses
        .filter(
          newAddress =>
            !state.addresses.some(
              existingAddress =>
                existingAddress.address === newAddress.address &&
                existingAddress.accountId === payload.accountId,
            ),
        )
        .map<AnyAddress>(a => ({
          ...a,
          blockchainName: payload.blockchainName,
          accountId: payload.accountId,
        }));
      if (newAddresses.length > 0) {
        state.addresses = [...state.addresses, ...newAddresses];
      }
    },
    resetAddresses: (
      state,
      { payload }: Readonly<PayloadAction<ResetAddressesPayload>>,
    ) => {
      state.addresses = state.addresses.filter(
        a => a.accountId !== payload.accountId,
      );
    },
    clearAddresses: state => {
      state.addresses = [];
    },
    setAliases: (
      state,
      { payload }: Readonly<PayloadAction<SetAliasesPayload>>,
    ) => {
      for (const entry of payload.aliases) {
        const existing = state.aliases[entry.address] ?? [];
        const filtered = existing.filter(
          existingEntry => existingEntry.aliasType !== entry.aliasType,
        );
        state.aliases[entry.address] = [...filtered, entry];
      }
    },
  },
  extraReducers: builder => {
    /**
     * Handles the removeAccount action to remove the addresses data for the account.
     * @param state - The current state of the addresses slice.
     * @param action - The removeAccount action containing the payload with accountId.
     */
    builder.addCase(walletsActions.wallets.removeAccount, (state, action) => {
      const { accountId } = action.payload;
      state.addresses = state.addresses.filter(a => a.accountId !== accountId);
    });

    /**
     * Handles the removeWallet action to remove addresses for all accounts of the wallet.
     * @param state - The current state of the addresses slice.
     * @param action - The removeWallet action containing the walletId and accountIds.
     */
    builder.addCase(walletsActions.wallets.removeWallet, (state, action) => {
      const { accountIds } = action.payload;
      state.addresses = state.addresses.filter(
        a => !accountIds.includes(a.accountId),
      );
    });
  },
  selectors: {
    selectAllAddresses: ({ addresses }) => addresses,
    selectAddressAliases: ({ aliases }) => aliases,
  },
});

export const selectByAccountId = markParameterizedSelector(
  createSelector(
    slice.selectors.selectAllAddresses,
    (_: unknown, accountId: AccountId) => accountId,
    (addresses, accountId) =>
      addresses.filter(addr => addr.accountId === accountId),
  ),
);

export const selectActiveNetworkAccountAddresses = createSelector(
  slice.selectors.selectAllAddresses,
  walletsSelectors.wallets.selectActiveNetworkAccounts,
  (allAddresses, activeAccounts) =>
    allAddresses.filter(addr =>
      activeAccounts.some(account => account.accountId === addr.accountId),
    ),
);

const NO_ALIASES: AddressAliasEntry[] = [];
export const selectAddressAliases = markParameterizedSelector(
  createSelector(
    slice.selectors.selectAddressAliases,
    (_: unknown, addresses: Address[]) => addresses,
    (aliases, addresses) => {
      const result = addresses
        .map(address => aliases[address])
        .flat()
        .filter(Boolean) as AddressAliasEntry[];
      return result.length === 0 ? NO_ALIASES : result;
    },
  ),
);

export const addressesReducers = {
  [slice.name]: slice.reducer,
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const addressesActions = { addresses: slice.actions };

/** Direct import of this is an anti-pattern. OK for tests. */
export const addressesSelectors = {
  addresses: {
    ...slice.selectors,
    selectByAccountId,
    selectAddressAliases,
    selectActiveNetworkAccountAddresses,
  },
};

export type AddressesStoreState = StateFromReducersMapObject<
  typeof addressesReducers
>;

import { markParameterizedSelector } from '@lace-contract/module';
import { walletsActions, walletsSelectors } from '@lace-contract/wallet-repo';
import { createSlice } from '@reduxjs/toolkit';
import isEqual from 'lodash/isEqual';
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

export type SetNextUnusedAddressPayload = {
  accountId: AccountId;
  address: Address;
};

export type AddressesSliceState = {
  addresses: AnyAddress[];
  aliases: Partial<Record<Address, AddressAliasEntry[]>>;
  /**
   * The account's one receive address with no history yet — what a receive
   * surface offers so each payment lands on a fresh address. Keyed by
   * accountId, which pins the network too (ADR 11).
   *
   * Deliberately NOT an `addresses` entry: every entry there is a per-round
   * FETCH target (transaction history, transaction polling), so an address
   * that by definition holds nothing would cost a provider request per round
   * per account, and entries carry the derivation data a re-derivation
   * produced, which nothing can supply for an index the wallet never derived.
   * Held exactly as the owner of the address walk served it, and left out of
   * the persist whitelist: a value from the last boot may have been used since.
   */
  nextUnusedAddresses: Partial<Record<AccountId, Address>>;
};

const initialState: AddressesSliceState = {
  addresses: [],
  aliases: {},
  nextUnusedAddresses: {},
};

const slice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    /**
     * Inserts new addresses (deduped by address + accountId) and refreshes the
     * `data` of already-present entries when the payload supplies different
     * data, so persisted entries self-heal on the next sync. State is only
     * mutated on an actual change: sync triggers combineLatest over the
     * addresses list, so an unchanged re-upsert must keep the same reference.
     */
    upsertAddresses: (
      state,
      { payload }: Readonly<PayloadAction<UpsertAddressesPayload>>,
    ) => {
      const newAddresses: AnyAddress[] = [];
      for (const incoming of payload.addresses) {
        const existing = state.addresses.find(
          a =>
            a.address === incoming.address && a.accountId === payload.accountId,
        );
        if (existing) {
          if (
            incoming.data !== undefined &&
            !isEqual(existing.data, incoming.data)
          ) {
            existing.data = incoming.data;
          }
        } else {
          newAddresses.push({
            ...incoming,
            blockchainName: payload.blockchainName,
            accountId: payload.accountId,
          });
        }
      }
      if (newAddresses.length > 0) {
        state.addresses = [...state.addresses, ...newAddresses];
      }
    },
    /**
     * Records the account's unused receive address, as served by the authority
     * that owns its address walk. Re-recording the address already held keeps
     * the state reference, so a re-read answering the same address is free.
     */
    setNextUnusedAddress: (
      state,
      { payload }: Readonly<PayloadAction<SetNextUnusedAddressPayload>>,
    ) => {
      state.nextUnusedAddresses[payload.accountId] = payload.address;
    },
    resetAddresses: (
      state,
      { payload }: Readonly<PayloadAction<ResetAddressesPayload>>,
    ) => {
      state.addresses = state.addresses.filter(
        a => a.accountId !== payload.accountId,
      );
      delete state.nextUnusedAddresses[payload.accountId];
    },
    clearAddresses: state => {
      state.addresses = [];
      state.nextUnusedAddresses = {};
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
      delete state.nextUnusedAddresses[accountId];
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
      for (const accountId of accountIds) {
        delete state.nextUnusedAddresses[accountId];
      }
    });
  },
  selectors: {
    selectAllAddresses: ({ addresses }) => addresses,
    selectAddressAliases: ({ aliases }) => aliases,
    selectNextUnusedAddresses: ({ nextUnusedAddresses }) => nextUnusedAddresses,
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

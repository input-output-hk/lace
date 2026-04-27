import { addressesSelectors } from '@lace-contract/addresses';
import {
  cardanoContextSelectors,
  type CardanoAddressData,
} from '@lace-contract/cardano-context';
import { walletsSelectors } from '@lace-contract/wallet-repo';
import { Serializable } from '@lace-lib/util-store';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import type { Cardano } from '@cardano-sdk/core';
import type { Address } from '@lace-contract/addresses';
import type {
  CardanoBip32AccountProps,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type {
  HardwareWalletAccount,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

export type MultiDelegationAccount = {
  account:
    | HardwareWalletAccount<CardanoBip32AccountProps>
    | InMemoryWalletAccount<CardanoBip32AccountProps>;
  utxos: Serializable<Cardano.Utxo[]>;
  rewardAccounts: {
    address: Cardano.PaymentAddress;
    rewardAccount: CardanoRewardAccount;
    stakeKeyIndex: number;
  }[];
};

export type HwErrorTranslationKeys = {
  title: TranslationKey;
  subtitle: TranslationKey;
};

export type MigrationStatus = 'awaitingHwConfirmation' | 'failed' | 'idle';

export type MigrateMultiDelegationState = {
  status: MigrationStatus;
  errorTranslationKeys?: HwErrorTranslationKeys;
};

const initialState: MigrateMultiDelegationState = {
  status: 'idle',
};

const slice = createSlice({
  name: 'migrateMultiDelegation',
  initialState,
  reducers: {
    hwSigningStarted: state => {
      state.status = 'awaitingHwConfirmation';
      state.errorTranslationKeys = undefined;
    },
    hwSigningFailed: (
      state,
      action: PayloadAction<{ errorTranslationKeys: HwErrorTranslationKeys }>,
    ) => {
      state.status = 'failed';
      state.errorTranslationKeys = action.payload.errorTranslationKeys;
    },
    reset: () => initialState,
  },
  selectors: {
    selectMigrationStatus: (state): MigrationStatus => state.status,
    selectErrorTranslationKeys: (state): HwErrorTranslationKeys | undefined =>
      state.errorTranslationKeys,
  },
});

const memoizeByAccountIds = {
  memoizeOptions: {
    resultEqualityCheck: (
      a: MultiDelegationAccount[],
      b: MultiDelegationAccount[],
    ): boolean =>
      a.length === b.length &&
      a.every(
        (account, index) =>
          account.account.accountId === b[index].account.accountId,
      ),
  },
};

const selectActiveNetworkAccounts = createSelector(
  walletsSelectors.wallets.selectActiveNetworkAccounts,
  cardanoContextSelectors.cardanoContext.selectBlockchainNetworkId,
  (accounts, activeBlockchainNetworkId) =>
    accounts.filter(
      account => account.blockchainNetworkId === activeBlockchainNetworkId,
    ),
);

const selectMultiDelegationAccounts = createSelector(
  cardanoContextSelectors.cardanoContext.selectAccountUtxos,
  addressesSelectors.addresses.selectAllAddresses,
  selectActiveNetworkAccounts,
  (
    accountUtxos,
    allAddresses,
    activeNetworkAccounts,
  ): MultiDelegationAccount[] =>
    Object.entries(accountUtxos)
      .map(([accountId, utxos]) => ({
        account: activeNetworkAccounts.find(
          account => account.accountId === accountId,
        ),
        utxos,
      }))
      .filter(
        (
          accountUtxos,
        ): accountUtxos is {
          account:
            | HardwareWalletAccount<CardanoBip32AccountProps>
            | InMemoryWalletAccount<CardanoBip32AccountProps>;
          utxos: Cardano.Utxo[];
        } =>
          !!accountUtxos.account &&
          accountUtxos.account.accountType !== 'MultiSig',
      )
      .map(({ account, utxos }) => ({
        account,
        utxos: Serializable.to(utxos),
        rewardAccounts: uniqBy(
          uniq(utxos.map(([_, txOut]) => txOut.address)).map(txOutAddress => ({
            address: txOutAddress,
            data: allAddresses.find(
              address =>
                address.address === (txOutAddress as unknown as Address),
            )?.data as CardanoAddressData,
          })),
          address => address.data.rewardAccount,
        )
          .filter(
            ({ data: { stakeKeyDerivationPath } }) => !!stakeKeyDerivationPath,
          )
          .map(
            ({ address, data: { rewardAccount, stakeKeyDerivationPath } }) => ({
              address,
              rewardAccount,
              stakeKeyIndex: stakeKeyDerivationPath!.index,
            }),
          ),
      }))
      .filter(account => account.rewardAccounts.length > 1),
  memoizeByAccountIds,
);

export const migrateMultiDelegationReducers = {
  [slice.name]: slice.reducer,
};

export const migrateMultiDelegationActions = {
  migrateMultiDelegation: {
    ...slice.actions,
    migrate: createAction<MultiDelegationAccount>(
      'migrateMultiDelegation/migrate',
    ),
  },
};

export const migrateMultiDelegationSelectors = {
  migrateMultiDelegation: {
    ...slice.selectors,
    selectMultiDelegationAccounts,
  },
};

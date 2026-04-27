import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  migrateMultiDelegationActions,
  migrateMultiDelegationReducers,
  migrateMultiDelegationSelectors,
  type HwErrorTranslationKeys,
  type MigrateMultiDelegationState,
} from '../../src/store/slice';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoBip32AccountProps,
} from '@lace-contract/cardano-context';
import type {
  InMemoryWalletAccount,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';

const chainId = Cardano.ChainIds.Mainnet;

const accountId1 = AccountId('account-1');
const accountId2 = AccountId('account-2');
const walletId = WalletId('wallet-1');

const rewardAccount1 = CardanoRewardAccount(
  'stake1uxpdrerp9wrxunfh6ukyv5267j70fzxgw0fr3z8zeac5vyqhf9jhy',
);
const rewardAccount2 = CardanoRewardAccount(
  'stake1uyfz49rtntfa9h0s98f6s28sg69weemgjhc4e8hm66d5yacalmqha',
);
const address1 = 'addr1address1' as Address & Cardano.PaymentAddress;
const address2 = 'addr1address2' as Address & Cardano.PaymentAddress;

const createInMemoryAccount = (
  accountId: AccountId,
): InMemoryWalletAccount<CardanoBip32AccountProps> => ({
  accountId,
  walletId,
  accountType: 'InMemory',
  blockchainName: 'Cardano',
  networkType: 'mainnet',
  blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
  metadata: { name: 'Account' },
  blockchainSpecific: {} as CardanoBip32AccountProps,
});

const createMultiSigAccount = (
  accountId: AccountId,
): MultiSigWalletAccount<CardanoBip32AccountProps> => ({
  accountId,
  walletId,
  accountType: 'MultiSig',
  blockchainName: 'Cardano',
  networkType: 'mainnet',
  blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
  metadata: { name: 'MultiSig Account' },
  blockchainSpecific: {} as CardanoBip32AccountProps,
  ownSigners: [],
});

const createUtxo = (address: Cardano.PaymentAddress): Cardano.Utxo =>
  [
    { txId: 'tx1' as Cardano.TransactionId, index: 0 },
    { address, value: { coins: 1_000_000n } },
  ] as Cardano.Utxo;

const createAddressWithRewardAccount = (
  address: Address,
  rewardAccount: CardanoRewardAccount,
  stakeKeyIndex: number,
): AnyAddress<CardanoAddressData> => ({
  address,
  accountId: accountId1,
  blockchainName: 'Cardano',
  data: {
    rewardAccount,
    stakeKeyDerivationPath: { index: stakeKeyIndex, role: 2 },
    accountIndex: 0,
    index: 0,
    networkId: chainId.networkId,
    type: AddressType.External,
    networkMagic: chainId.networkMagic,
  },
});

describe('migrateMultiDelegationSelectors', () => {
  describe('selectMultiDelegationAccounts', () => {
    const { selectMultiDelegationAccounts } =
      migrateMultiDelegationSelectors.migrateMultiDelegation;

    it('returns accounts with multiple distinct reward accounts', () => {
      const account = createInMemoryAccount(accountId1);
      const utxos = [createUtxo(address1), createUtxo(address2)];
      const addresses = [
        createAddressWithRewardAccount(address1, rewardAccount1, 0),
        createAddressWithRewardAccount(address2, rewardAccount2, 1),
      ];

      const result = selectMultiDelegationAccounts.resultFunc(
        { [accountId1]: utxos },
        addresses,
        [account],
      );

      expect(result).toHaveLength(1);
      expect(result[0].account.accountId).toBe(accountId1);
      expect(result[0].rewardAccounts).toHaveLength(2);
    });

    it('excludes accounts with single reward account', () => {
      const account = createInMemoryAccount(accountId1);
      const utxos = [createUtxo(address1), createUtxo(address1)];
      const addresses = [
        createAddressWithRewardAccount(address1, rewardAccount1, 0),
      ];

      const result = selectMultiDelegationAccounts.resultFunc(
        { [accountId1]: utxos },
        addresses,
        [account],
      );

      expect(result).toHaveLength(0);
    });

    it('excludes MultiSig accounts', () => {
      const multiSigAccount = createMultiSigAccount(accountId2);
      const utxos = [createUtxo(address1), createUtxo(address2)];
      const addresses = [
        createAddressWithRewardAccount(address1, rewardAccount1, 0),
        createAddressWithRewardAccount(address2, rewardAccount2, 1),
      ];

      const result = selectMultiDelegationAccounts.resultFunc(
        { [accountId2]: utxos },
        addresses,
        [multiSigAccount],
      );

      expect(result).toHaveLength(0);
    });
  });
});

describe('migrateMultiDelegation reducer', () => {
  const reducer = migrateMultiDelegationReducers.migrateMultiDelegation;
  const keys: HwErrorTranslationKeys = {
    title: 'hw-error.app-not-open.title',
    subtitle: 'hw-error.app-not-open.subtitle',
  };

  const initial: MigrateMultiDelegationState = { status: 'idle' };

  it('hwSigningStarted → awaitingHwConfirmation, clears error keys', () => {
    const previous: MigrateMultiDelegationState = {
      status: 'failed',
      errorTranslationKeys: keys,
    };
    const next = reducer(
      previous,
      migrateMultiDelegationActions.migrateMultiDelegation.hwSigningStarted(),
    );
    expect(next).toEqual({ status: 'awaitingHwConfirmation' });
  });

  it('hwSigningFailed → failed with error keys', () => {
    const next = reducer(
      initial,
      migrateMultiDelegationActions.migrateMultiDelegation.hwSigningFailed({
        errorTranslationKeys: keys,
      }),
    );
    expect(next).toEqual({ status: 'failed', errorTranslationKeys: keys });
  });

  it('reset → idle', () => {
    const previous: MigrateMultiDelegationState = {
      status: 'failed',
      errorTranslationKeys: keys,
    };
    const next = reducer(
      previous,
      migrateMultiDelegationActions.migrateMultiDelegation.reset(),
    );
    expect(next).toEqual(initial);
  });
});

describe('migrateMultiDelegation selectors (state)', () => {
  const { selectMigrationStatus, selectErrorTranslationKeys } =
    migrateMultiDelegationSelectors.migrateMultiDelegation;
  const keys: HwErrorTranslationKeys = {
    title: 'hw-error.generic.title',
    subtitle: 'hw-error.generic.subtitle',
  };

  it('selectMigrationStatus returns current status', () => {
    expect(
      selectMigrationStatus({
        migrateMultiDelegation: { status: 'awaitingHwConfirmation' },
      }),
    ).toBe('awaitingHwConfirmation');
  });

  it('selectErrorTranslationKeys returns stored keys', () => {
    expect(
      selectErrorTranslationKeys({
        migrateMultiDelegation: {
          status: 'failed',
          errorTranslationKeys: keys,
        },
      }),
    ).toEqual(keys);
  });
});

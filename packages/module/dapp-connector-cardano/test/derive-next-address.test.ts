import { Cardano } from '@cardano-sdk/core';
import { AddressType, KeyRole } from '@cardano-sdk/key-management';
import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APIErrorCode } from '../src/common/api-error';
import { createDeriveNextAddress } from '../src/common/store/derive-next-address';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  Address,
  AnyAddress,
  UpsertAddressesPayload,
} from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import type {
  InMemoryWalletAccount,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';

const deriveAddressMock = vi.fn();

vi.mock('@cardano-sdk/key-management', async () => {
  const actual = await vi.importActual('@cardano-sdk/key-management');
  return {
    ...actual,
    Bip32Account: vi.fn().mockImplementation(() => ({
      deriveAddress: deriveAddressMock,
    })),
  };
});

vi.mock('@cardano-sdk/crypto', async () => {
  const actual = await vi.importActual('@cardano-sdk/crypto');
  return {
    ...actual,
    SodiumBip32Ed25519: { create: vi.fn().mockResolvedValue({}) },
  };
});

const chainId: Cardano.ChainId = {
  networkId: Cardano.NetworkId.Testnet,
  networkMagic: Cardano.NetworkMagics.Preprod,
};

const accountId = AccountId('acc-1');
const walletId = WalletId('wallet-1');
const rewardAccount = 'stake_test1xxx' as CardanoRewardAccount;
const blockchainNetworkId = BlockchainNetworkId('cardano-preprod');

const cardanoAccount: InMemoryWalletAccount<CardanoBip32AccountProps> = {
  accountId,
  walletId,
  accountType: 'InMemory',
  blockchainName: 'Cardano',
  blockchainNetworkId,
  blockchainSpecific: {
    accountIndex: 0,
    extendedAccountPublicKey: '0'.repeat(128) as Bip32PublicKeyHex,
    chainId,
  },
  metadata: { name: 'Test' },
  networkType: 'testnet',
};

const multiSigAccount: MultiSigWalletAccount<CardanoMultiSigAccountProps> = {
  accountId,
  walletId,
  accountType: 'MultiSig',
  blockchainName: 'Cardano',
  blockchainNetworkId,
  blockchainSpecific: {
    chainId,
    paymentKeyPath: { index: 0, role: KeyRole.External },
    stakingKeyPath: { index: 0, role: KeyRole.Stake },
    paymentScript: {} as Cardano.NativeScript,
    stakingScript: {} as Cardano.NativeScript,
  },
  metadata: { name: 'MultiSig' },
  networkType: 'testnet',
  ownSigners: [],
};

const existingAddress: AnyAddress<CardanoAddressData> = {
  address: 'addr_test1aaa' as Address,
  accountId,
  blockchainName: 'Cardano',
  data: {
    type: AddressType.External,
    index: 0,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
    accountIndex: 0,
    rewardAccount,
    stakeKeyDerivationPath: { index: 0, role: KeyRole.Stake },
  },
};

const derivedGroupedAddress = {
  address: 'addr_test1bbb',
  index: 1,
  type: AddressType.External,
  accountIndex: 0,
  networkId: chainId.networkId,
  rewardAccount,
  stakeKeyDerivationPath: { index: 0, role: KeyRole.Stake },
};

describe('createDeriveNextAddress', () => {
  beforeEach(() => {
    deriveAddressMock.mockReset();
    deriveAddressMock.mockResolvedValue(derivedGroupedAddress);
  });

  it('throws when account is missing', async () => {
    const derive = createDeriveNextAddress({
      selectAccounts$: of([]),
      selectAllAddresses$: of([]),
      upsertAddresses: () => {},
    });

    await expect(derive(accountId)).rejects.toMatchObject({
      code: APIErrorCode.InternalError,
    });
  });

  it('throws for MultiSig account', async () => {
    const derive = createDeriveNextAddress({
      selectAccounts$: of([multiSigAccount]),
      selectAllAddresses$: of([existingAddress]),
      upsertAddresses: () => {},
    });

    await expect(derive(accountId)).rejects.toMatchObject({
      code: APIErrorCode.InternalError,
    });
  });

  it('throws when no External addresses for the account', async () => {
    const derive = createDeriveNextAddress({
      selectAccounts$: of([cardanoAccount]),
      selectAllAddresses$: of([]),
      upsertAddresses: () => {},
    });

    await expect(derive(accountId)).rejects.toMatchObject({
      code: APIErrorCode.InternalError,
    });
  });

  it('derives next index and emits upsert payload, resolves on state update', async () => {
    const addressesState$ = new BehaviorSubject<AnyAddress[]>([
      existingAddress,
    ]);
    const upsertAddresses = vi
      .fn<(payload: UpsertAddressesPayload) => void>()
      .mockImplementation(payload => {
        addressesState$.next([
          ...addressesState$.value,
          ...payload.addresses.map(a => ({
            ...a,
            accountId: payload.accountId,
            blockchainName: payload.blockchainName,
          })),
        ]);
      });

    const derive = createDeriveNextAddress({
      selectAccounts$: of([cardanoAccount]),
      selectAllAddresses$: addressesState$,
      upsertAddresses,
    });

    const result = await derive(accountId);

    expect(deriveAddressMock).toHaveBeenCalledWith(
      { type: AddressType.External, index: 1 },
      0,
    );
    expect(upsertAddresses).toHaveBeenCalledTimes(1);
    expect(upsertAddresses.mock.calls[0][0]).toMatchObject({
      accountId,
      blockchainName: 'Cardano',
      addresses: [{ address: derivedGroupedAddress.address }],
    });
    expect(result.address).toBe(derivedGroupedAddress.address);
    expect(result.accountId).toBe(accountId);
    expect(result.blockchainName).toBe('Cardano');

    const latest = await firstValueFrom(addressesState$);
    expect(latest.some(a => a.address === derivedGroupedAddress.address)).toBe(
      true,
    );
  });
});

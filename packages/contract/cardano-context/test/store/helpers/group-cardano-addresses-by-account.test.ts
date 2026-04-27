import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { groupCardanoAddressesByAccount } from '../../../src/store/helpers';
import { CardanoRewardAccount } from '../../../src/types';
import { cardanoAccount0Addr, cardanoAccount1Addr } from '../../mocks';

import type { CardanoAddressData } from '../../../src/types';
import type { AnyAddress, Address } from '@lace-contract/addresses';

describe('groupCardanoAddressesByAccount', () => {
  const chainId = Cardano.ChainIds.Preprod;

  const rewardAccount1 = CardanoRewardAccount(
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  );
  const rewardAccount2 = CardanoRewardAccount(
    'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx',
  );

  const accountId1 = cardanoAccount0Addr.accountId;
  const accountId2 = cardanoAccount1Addr.accountId;

  it('filters out non-Cardano addresses', () => {
    const addresses: AnyAddress[] = [
      {
        accountId: AccountId('account1'),
        address: 'addr1' as Address,
        blockchainName: 'Midnight',
      },
      {
        accountId: accountId1,
        address: 'addr2' as Address,
        blockchainName: 'Cardano',
        data: {
          networkId: 0,
          rewardAccount: rewardAccount1,
          networkMagic: chainId.networkMagic,
          index: 0,
          type: AddressType.Internal,
        },
      },
    ];

    const result = groupCardanoAddressesByAccount(addresses, chainId);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result[accountId1]).toHaveLength(1);
    expect(result[accountId1][0].address).toBe('addr2');
  });

  it('filters out addresses with different networkMagic', () => {
    const addresses: AnyAddress<CardanoAddressData>[] = [
      {
        accountId: accountId1,
        address: 'addr1' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: 1,
          rewardAccount: rewardAccount1,
          index: 0,
          type: AddressType.Internal,
          networkMagic: Cardano.NetworkMagics.Mainnet,
        },
      },
      {
        accountId: accountId2,
        address: 'addr2' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: 0,
          rewardAccount: rewardAccount2,
          index: 0,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
    ];

    const result = groupCardanoAddressesByAccount(addresses, chainId);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result[accountId2]).toHaveLength(1);
    expect(result[accountId2][0].address).toBe('addr2');
  });

  it('groups addresses by account', () => {
    const addresses: AnyAddress<CardanoAddressData>[] = [
      {
        accountId: accountId1,
        address: 'addr1' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: 0,
          rewardAccount: rewardAccount1,
          index: 0,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
      {
        accountId: accountId1,
        address: 'addr2' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 1,
          networkId: 0,
          rewardAccount: rewardAccount1,
          index: 1,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
      {
        accountId: accountId2,
        address: 'addr3' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: 0,
          rewardAccount: rewardAccount2,
          index: 0,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
    ];

    const result = groupCardanoAddressesByAccount(addresses, chainId);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result[accountId1]).toHaveLength(2);
    expect(result[accountId2]).toHaveLength(1);

    expect(result[accountId1].map(a => a.address)).toEqual(['addr1', 'addr2']);
    expect(result[accountId2].map(a => a.address)).toEqual(['addr3']);
  });
});

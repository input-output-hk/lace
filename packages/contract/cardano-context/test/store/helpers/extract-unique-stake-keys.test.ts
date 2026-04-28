import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { extractUniqueStakeKeys } from '../../../src/store/helpers';
import { CardanoRewardAccount } from '../../../src/types';

import type { CardanoAddressData } from '../../../src/types';
import type { AnyAddress, Address } from '@lace-contract/addresses';

describe('extractUniqueStakeKeys', () => {
  const chainId = Cardano.ChainIds.Preprod;

  const rewardAccount1 = CardanoRewardAccount(
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  );
  const rewardAccount2 = CardanoRewardAccount(
    'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx',
  );

  const accountId1 = AccountId('account1');
  const accountId2 = AccountId('account2');

  it('extracts unique stake keys from addresses', () => {
    const addresses: AnyAddress<CardanoAddressData>[] = [
      {
        accountId: accountId1,
        address: 'addr1' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: chainId.networkId,
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
          accountIndex: 0,
          networkId: chainId.networkId,
          rewardAccount: rewardAccount2,
          index: 1,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
    ];

    const result = extractUniqueStakeKeys(addresses);

    expect(result).toHaveLength(2);
    expect(result).toContain(rewardAccount1);
    expect(result).toContain(rewardAccount2);
  });

  it('returns empty array when addresses have no reward accounts', () => {
    const addresses: AnyAddress<CardanoAddressData>[] = [
      {
        accountId: accountId1,
        address: 'addr1' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: chainId.networkId,
          rewardAccount: undefined as unknown as CardanoRewardAccount,
          index: 0,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
    ];

    const result = extractUniqueStakeKeys(addresses);

    expect(result).toHaveLength(0);
  });

  it('deduplicates stake keys when same reward account appears multiple times', () => {
    const addresses: AnyAddress<CardanoAddressData>[] = [
      {
        accountId: accountId1,
        address: 'addr1' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: chainId.networkId,
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
          accountIndex: 0,
          networkId: chainId.networkId,
          rewardAccount: rewardAccount1, // Same as addr1
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
          accountIndex: 1,
          networkId: chainId.networkId,
          rewardAccount: rewardAccount1, // Same stake key again
          index: 0,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
    ];

    const result = extractUniqueStakeKeys(addresses);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(rewardAccount1);
  });

  it('handles empty array', () => {
    const result = extractUniqueStakeKeys([]);
    expect(result).toHaveLength(0);
  });

  it('handles mixed addresses with and without reward accounts', () => {
    const addresses: AnyAddress<CardanoAddressData>[] = [
      {
        accountId: accountId1,
        address: 'addr1' as Address,
        blockchainName: 'Cardano',
        data: {
          accountIndex: 0,
          networkId: chainId.networkId,
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
          accountIndex: 0,
          networkId: chainId.networkId,
          rewardAccount: undefined as unknown as CardanoRewardAccount,
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
          accountIndex: 1,
          networkId: chainId.networkId,
          rewardAccount: rewardAccount2,
          index: 0,
          type: AddressType.Internal,
          networkMagic: chainId.networkMagic,
        },
      },
    ];

    const result = extractUniqueStakeKeys(addresses);

    expect(result).toHaveLength(2);
    expect(result).toContain(rewardAccount1);
    expect(result).toContain(rewardAccount2);
  });
});

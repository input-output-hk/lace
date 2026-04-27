import { Cardano } from '@cardano-sdk/core';
import { AddressType, KeyRole } from '@cardano-sdk/key-management';
import { HttpClientError } from '@lace-lib/util-provider';
import { firstValueFrom, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostAddressDiscovery } from '../../../src/blockfrost';

import type { Bip32Account } from '@cardano-sdk/key-management';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';
import type { Mocked } from 'vitest';

describe('BlockfrostAddressDiscovery', () => {
  let clientMock: Mocked<HttpClient>;
  let loggerMock: Mocked<Logger>;
  let accountMock: Mocked<Bip32Account>;
  let addressDiscovery: BlockfrostAddressDiscovery;

  beforeEach(() => {
    clientMock = {
      request: vi.fn(),
    } as unknown as Mocked<HttpClient>;

    loggerMock = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Mocked<Logger>;

    accountMock = {
      deriveAddress: vi.fn(),
    } as unknown as Mocked<Bip32Account>;

    addressDiscovery = new BlockfrostAddressDiscovery(clientMock, loggerMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should discover addresses correctly', async () => {
    const rewardAccount = 'stake1u9p...' as Cardano.RewardAccount;
    const paymentAddress1 = 'addr1...' as Cardano.PaymentAddress;
    const paymentAddress2 = 'addr2...' as Cardano.PaymentAddress;

    accountMock.deriveAddress
      .mockResolvedValueOnce({
        address: paymentAddress1,
        rewardAccount,
        type: AddressType.External,
        index: 0,
        networkId: Cardano.NetworkId.Mainnet,
        accountIndex: 0,
        stakeKeyDerivationPath: {
          index: 0,
          role: KeyRole.Stake,
        },
      })
      .mockResolvedValue({
        address: paymentAddress2,
        rewardAccount,
        type: AddressType.External,
        index: 1,
        networkId: Cardano.NetworkId.Mainnet,
        accountIndex: 0,
        stakeKeyDerivationPath: {
          index: 0,
          role: KeyRole.Stake,
        },
      });

    clientMock.request.mockResolvedValueOnce({
      status: 200,
      data: [
        {
          address: paymentAddress1,
          rewardAccount,
          type: AddressType.External,
          index: 0,
          networkId: Cardano.NetworkId.Mainnet,
          accountIndex: 0,
          stakeKeyDerivationPath: {
            index: 0,
            role: KeyRole.Stake,
          },
        },
        {
          address: paymentAddress2,
          rewardAccount,
          type: AddressType.External,
          index: 1,
          networkId: Cardano.NetworkId.Mainnet,
          accountIndex: 0,
          stakeKeyDerivationPath: {
            index: 0,
            role: KeyRole.Stake,
          },
        },
      ],
    });

    const result = await firstValueFrom(
      addressDiscovery.discover(accountMock).pipe(toArray()),
    );

    expect(result).toHaveLength(2);
    expect(clientMock.request).toHaveBeenCalledWith(
      `accounts/${rewardAccount}/addresses?count=100&page=1`,
      undefined,
    );
  });

  it('should not throw if Blockfrost returns 404 not found', async () => {
    const rewardAccount = 'stake1u9p...' as Cardano.RewardAccount;
    const paymentAddress1 = 'addr1...' as Cardano.PaymentAddress;

    accountMock.deriveAddress.mockResolvedValue({
      address: paymentAddress1,
      rewardAccount,
      type: AddressType.External,
      index: 0,
      networkId: Cardano.NetworkId.Mainnet,
      accountIndex: 0,
      stakeKeyDerivationPath: {
        index: 0,
        role: KeyRole.Stake,
      },
    });

    const error = new HttpClientError(404, 'Not Found');
    error.status = 404;

    clientMock.request.mockRejectedValueOnce(error);
    const result = await firstValueFrom(
      addressDiscovery.discover(accountMock).pipe(toArray()),
    );
    expect(result).toHaveLength(1); // There is always at least one address
  });

  it('should handle unknown/franken addresses gracefully', async () => {
    const rewardAccount = 'stake1u9p...' as Cardano.RewardAccount;
    const paymentAddress1 = 'addr1...' as Cardano.PaymentAddress;
    const frankenAddress = 'addrUnknown...' as Cardano.PaymentAddress;

    accountMock.deriveAddress.mockResolvedValue({
      address: paymentAddress1,
      rewardAccount,
      type: AddressType.External,
      index: 0,
      networkId: Cardano.NetworkId.Mainnet,
      accountIndex: 0,
      stakeKeyDerivationPath: {
        index: 0,
        role: KeyRole.Stake,
      },
    });

    clientMock.request.mockResolvedValueOnce({
      status: 200,
      data: [{ address: paymentAddress1 }, { address: frankenAddress }],
    });

    const result = await firstValueFrom(
      addressDiscovery.discover(accountMock).pipe(toArray()),
    );

    expect(result).toHaveLength(1);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[BlockfrostAddressDiscovery]',
      'The following addresses under stakeIndex 0 were not matched:',
      [frankenAddress],
    );
  });
});

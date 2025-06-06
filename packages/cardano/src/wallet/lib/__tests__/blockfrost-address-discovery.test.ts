/* eslint-disable no-magic-numbers */
import { BlockfrostAddressDiscovery } from '../blockfrost-address-discovery';
import { Cardano } from '@cardano-sdk/core';
import { BlockfrostClient, BlockfrostError } from '@cardano-sdk/cardano-services-client';
import { Logger } from 'ts-log';
import { AddressType, Bip32Account, KeyRole } from '@cardano-sdk/key-management';

jest.mock('@cardano-sdk/cardano-services-client');

describe('BlockfrostAddressDiscovery', () => {
  let clientMock: jest.Mocked<BlockfrostClient>;
  let loggerMock: jest.Mocked<Logger>;
  let accountMock: jest.Mocked<Bip32Account>;
  let addressDiscovery: BlockfrostAddressDiscovery;

  beforeEach(() => {
    clientMock = {
      request: jest.fn()
    } as unknown as jest.Mocked<BlockfrostClient>;

    loggerMock = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    accountMock = {
      deriveAddress: jest.fn()
    } as unknown as jest.Mocked<Bip32Account>;

    addressDiscovery = new BlockfrostAddressDiscovery(clientMock, loggerMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should discover addresses correctly', async () => {
    const rewardAccount = 'stake1u9p...' as Cardano.RewardAccount;
    const paymentAddress1 = 'addr1...' as Cardano.PaymentAddress;
    const paymentAddress2 = 'addr2...' as Cardano.PaymentAddress;

    accountMock.deriveAddress
      .mockReturnValueOnce({
        address: paymentAddress1,
        rewardAccount,
        type: AddressType.External,
        index: 0,
        networkId: Cardano.NetworkId.Mainnet,
        accountIndex: 0,
        stakeKeyDerivationPath: {
          index: 0,
          role: KeyRole.Stake
        }
      })
      .mockReturnValue({
        address: paymentAddress2,
        rewardAccount,
        type: AddressType.External,
        index: 1,
        networkId: Cardano.NetworkId.Mainnet,
        accountIndex: 0,
        stakeKeyDerivationPath: {
          index: 0,
          role: KeyRole.Stake
        }
      });

    clientMock.request.mockResolvedValueOnce([
      {
        address: paymentAddress1,
        rewardAccount,
        type: AddressType.External,
        index: 0,
        networkId: Cardano.NetworkId.Mainnet,
        accountIndex: 0,
        stakeKeyDerivationPath: {
          index: 0,
          role: KeyRole.Stake
        }
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
          role: KeyRole.Stake
        }
      }
    ]);

    const result = await addressDiscovery.discover(accountMock);

    expect(result).toHaveLength(2);
    expect(clientMock.request).toHaveBeenCalledWith(`accounts/${rewardAccount}/addresses?count=100&page=1`);
  });

  it('should not throw if Blockfrost returns 404 not found', async () => {
    const rewardAccount = 'stake1u9p...' as Cardano.RewardAccount;
    const paymentAddress1 = 'addr1...' as Cardano.PaymentAddress;

    accountMock.deriveAddress.mockReturnValue({
      address: paymentAddress1,
      rewardAccount,
      type: AddressType.External,
      index: 0,
      networkId: Cardano.NetworkId.Mainnet,
      accountIndex: 0,
      stakeKeyDerivationPath: {
        index: 0,
        role: KeyRole.Stake
      }
    });

    const error = new BlockfrostError(404, 'Not Found');
    error.status = 404;

    clientMock.request.mockRejectedValueOnce(error);
    const result = await addressDiscovery.discover(accountMock);
    expect(result).toHaveLength(1); // There is always at least one address
  });

  it('should handle unknown/franken addresses gracefully', async () => {
    const rewardAccount = 'stake1u9p...' as Cardano.RewardAccount;
    const paymentAddress1 = 'addr1...' as Cardano.PaymentAddress;
    const frankenAddress = 'addrUnknown...' as Cardano.PaymentAddress;

    accountMock.deriveAddress.mockReturnValue({
      address: paymentAddress1,
      rewardAccount,
      type: AddressType.External,
      index: 0,
      networkId: Cardano.NetworkId.Mainnet,
      accountIndex: 0,
      stakeKeyDerivationPath: {
        index: 0,
        role: KeyRole.Stake
      }
    });

    clientMock.request.mockResolvedValueOnce([{ address: paymentAddress1 }, { address: frankenAddress }]);

    const result = await addressDiscovery.discover(accountMock);

    expect(result).toHaveLength(1);
    expect(loggerMock.warn).toHaveBeenCalledWith('The following addresses under stakeIndex 0 were not matched:', [
      frankenAddress
    ]);
  });
});

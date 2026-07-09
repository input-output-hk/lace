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

  it('discovers an address at payment index 99 (the maximum discoverable under gap=100; regression: was lost when gap regressed to 20)', async () => {
    const targetAddress =
      `addr-${AddressType.External}-99-0` as Cardano.PaymentAddress;

    accountMock.deriveAddress.mockImplementation(
      async ({ type, index }, stakeIndex) => ({
        address:
          `addr-${type}-${index}-${stakeIndex}` as Cardano.PaymentAddress,
        rewardAccount: `stake${stakeIndex}` as Cardano.RewardAccount,
        type,
        index,
        networkId: Cardano.NetworkId.Mainnet,
        accountIndex: 0,
        stakeKeyDerivationPath: {
          index: stakeIndex,
          role: KeyRole.Stake,
        },
      }),
    );

    const notFound = new HttpClientError(404, 'Not Found');
    notFound.status = 404;

    clientMock.request
      .mockResolvedValueOnce({
        status: 200,
        data: [{ address: targetAddress }],
      })
      .mockRejectedValue(notFound);

    const result = await firstValueFrom(
      addressDiscovery.discover(accountMock).pipe(toArray()),
    );

    const discoveredAddresses = result
      .filter(r => r.isOk())
      .map(r => r.value.address);
    expect(discoveredAddresses).toContain(targetAddress);
  });

  describe('thorough mode', () => {
    const setupGeneratingMock = () =>
      accountMock.deriveAddress.mockImplementation(
        async ({ type, index }, stakeIndex) => ({
          address:
            `addr-${type}-${index}-${stakeIndex}` as Cardano.PaymentAddress,
          rewardAccount: `stake${stakeIndex}` as Cardano.RewardAccount,
          type,
          index,
          networkId: Cardano.NetworkId.Mainnet,
          accountIndex: 0,
          stakeKeyDerivationPath: {
            index: stakeIndex,
            role: KeyRole.Stake,
          },
        }),
      );

    const setupBlockfrostResponses = (
      initialAddresses: Cardano.PaymentAddress[],
    ) => {
      const notFound = new HttpClientError(404, 'Not Found');
      notFound.status = 404;
      clientMock.request
        .mockResolvedValueOnce({
          status: 200,
          data: initialAddresses.map(address => ({ address })),
        })
        .mockRejectedValue(notFound);
    };

    it('terminates at the same point as standard mode when the set drains before the gap fires (common case)', async () => {
      setupGeneratingMock();
      const lowIndexAddress =
        `addr-${AddressType.External}-1-0` as Cardano.PaymentAddress;
      setupBlockfrostResponses([lowIndexAddress]);

      const result = await firstValueFrom(
        addressDiscovery
          .discover(accountMock, { thorough: true })
          .pipe(toArray()),
      );

      const discoveredAddresses = result
        .filter(r => r.isOk())
        .map(r => r.value.address);
      expect(discoveredAddresses).toContain(lowIndexAddress);
    });

    it('discovers a high-index entry past the gap (set entry at index 200; standard mode would miss it)', async () => {
      setupGeneratingMock();
      const highIndexAddress =
        `addr-${AddressType.External}-200-0` as Cardano.PaymentAddress;
      setupBlockfrostResponses([highIndexAddress]);

      const result = await firstValueFrom(
        addressDiscovery
          .discover(accountMock, { thorough: true })
          .pipe(toArray()),
      );

      const discoveredAddresses = result
        .filter(r => r.isOk())
        .map(r => r.value.address);
      expect(discoveredAddresses).toContain(highIndexAddress);

      // Bounded above by 2 derives × (200 match + 100 trailing gap) plus a
      // handful for firstAddress / reward derivations across stake-key gap.
      // Standard mode would have stopped before paymentIndex 100 (≤ ~210 derives).
      const deriveCallCount = accountMock.deriveAddress.mock.calls.length;
      expect(deriveCallCount).toBeGreaterThan(600);
      expect(deriveCallCount).toBeLessThan(700);
    });

    it('terminates at HARD_UPPER_BOUND when an entry never matches (franken case)', async () => {
      setupGeneratingMock();
      const frankenAddress =
        'addr-franken-never-matches' as Cardano.PaymentAddress;
      setupBlockfrostResponses([frankenAddress]);

      const result = await firstValueFrom(
        addressDiscovery
          .discover(accountMock, { thorough: true })
          .pipe(toArray()),
      );

      // The franken address must not appear in the discovered set.
      const discoveredAddresses = result
        .filter(r => r.isOk())
        .map(r => r.value.address);
      expect(discoveredAddresses).not.toContain(frankenAddress);

      // Loop walked HARD_UPPER_BOUND = 10_000 indices before stopping.
      // 2 derives per index plus a few for firstAddress / reward derivations
      // across the stake-key gap.
      const deriveCallCount = accountMock.deriveAddress.mock.calls.length;
      expect(deriveCallCount).toBeGreaterThanOrEqual(20_000);
      expect(deriveCallCount).toBeLessThan(20_050);
    }, 30_000);
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

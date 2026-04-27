import { Cardano } from '@cardano-sdk/core';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostRegistrationsProvider } from '../../../src/blockfrost';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { HttpClient } from '@lace-lib/util-provider';

const rewardAccount = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

const mockRegistrations: Responses['account_registration_content'] = [
  {
    tx_hash: '6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad',
    action: 'registered',
  },
  {
    tx_hash: '7804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99dae',
    action: 'deregistered',
  },
];

describe('BlockfrostRegistrationsProvider', () => {
  let provider: BlockfrostRegistrationsProvider;
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
    } as unknown as HttpClient;

    provider = new BlockfrostRegistrationsProvider(mockClient, dummyLogger);
  });

  describe('getAccountRegistrations', () => {
    it('should return registrations for a reward account', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({
        data: mockRegistrations,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountRegistrations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].txHash).toBe(
          Cardano.TransactionId(
            '6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad',
          ),
        );
        expect(result.value[0].action).toBe('registered');

        expect(result.value[1].txHash).toBe(
          Cardano.TransactionId(
            '7804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99dae',
          ),
        );
        expect(result.value[1].action).toBe('deregistered');
      }
    });

    it('should return registrations for a single account with multiple pages', async () => {
      const createMockResponse = (count = 100) => ({
        data: Array.from({ length: count }, (_, index) => ({
          tx_hash: `6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99c${index
            .toString(16)
            .padStart(2, '0')}`,
          action: index % 2 === 0 ? 'registered' : 'deregistered',
        })),
        status: 200,
      });

      // Create mocked pages of registrations
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce(createMockResponse())
        .mockResolvedValueOnce(createMockResponse())
        .mockResolvedValueOnce(createMockResponse(50));

      const result = await firstValueFrom(
        provider.getAccountRegistrations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Check that all pages were fetched
        expect(result.value).toHaveLength(250);
        expect(result.value[0].action).toBe('registered');
        expect(result.value[1].action).toBe('deregistered');
      }
    });

    it('should handle empty registrations array', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({
        data: [],
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountRegistrations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('API Error'));

      const result = await firstValueFrom(
        provider.getAccountRegistrations({ rewardAccount }),
      );

      expect(result.isErr()).toBe(true);
    });

    it('should correctly map registration data structure', async () => {
      const singleRegistration: Responses['account_registration_content'] = [
        {
          tx_hash:
            '8804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cae',
          action: 'registered',
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({
        data: singleRegistration,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountRegistrations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual({
          txHash: Cardano.TransactionId(
            '8804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cae',
          ),
          action: 'registered',
        });
      }
    });

    it('should handle both registered and deregistered actions', async () => {
      const mixedRegistrations: Responses['account_registration_content'] = [
        {
          tx_hash:
            'a804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99caf',
          action: 'registered',
        },
        {
          tx_hash:
            'b804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cb0',
          action: 'deregistered',
        },
        {
          tx_hash:
            'c804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cb1',
          action: 'registered',
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({
        data: mixedRegistrations,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountRegistrations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0].action).toBe('registered');
        expect(result.value[1].action).toBe('deregistered');
        expect(result.value[2].action).toBe('registered');
      }
    });
  });
});

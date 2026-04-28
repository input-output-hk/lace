import { Cardano } from '@cardano-sdk/core';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-sdk/util';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostWithdrawalsProvider } from '../../../src/blockfrost';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { HttpClient } from '@lace-lib/util-provider';

const rewardAccount = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

const mockWithdrawals: Responses['account_withdrawal_content'] = [
  {
    tx_hash: '6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad',
    amount: '1000000',
  },
  {
    tx_hash: '7804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99dae',
    amount: '1500000',
  },
];

describe('BlockfrostWithdrawalsProvider', () => {
  let provider: BlockfrostWithdrawalsProvider;
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
    } as unknown as HttpClient;

    provider = new BlockfrostWithdrawalsProvider(mockClient, dummyLogger);
  });

  describe('getAccountWithdrawals', () => {
    it('should return withdrawals for a reward account', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({
        data: mockWithdrawals,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountWithdrawals({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].txHash).toBe(
          Cardano.TransactionId(
            '6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad',
          ),
        );
        expect(result.value[0].amount).toEqual(BigNumber(BigInt('1000000')));

        expect(result.value[1].txHash).toBe(
          Cardano.TransactionId(
            '7804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99dae',
          ),
        );
        expect(result.value[1].amount).toEqual(BigNumber(BigInt('1500000')));
      }
    });

    it('should return withdrawals for a single account with multiple pages', async () => {
      const createMockResponse = (count = 100) => ({
        data: Array.from({ length: count }, (_, index) => ({
          tx_hash: `6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99c${index
            .toString(16)
            .padStart(2, '0')}`,
          amount: (1000000 + index * 1000).toString(),
        })),
        status: 200,
      });

      // Create mocked pages of withdrawals
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce(createMockResponse())
        .mockResolvedValueOnce(createMockResponse())
        .mockResolvedValueOnce(createMockResponse(50));

      const result = await firstValueFrom(
        provider.getAccountWithdrawals({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Check that all pages were fetched
        expect(result.value).toHaveLength(250);
        expect(result.value[0].amount).toEqual(BigNumber(BigInt('1000000')));
        expect(result.value[99].amount).toEqual(BigNumber(BigInt('1099000')));
        expect(result.value[100].amount).toEqual(BigNumber(BigInt('1000000')));
      }
    });

    it('should handle empty withdrawals array', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({
        data: [],
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountWithdrawals({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('API Error'));

      const result = await firstValueFrom(
        provider.getAccountWithdrawals({ rewardAccount }),
      );

      expect(result.isErr()).toBe(true);
    });

    it('should correctly map withdrawal data structure', async () => {
      const singleWithdrawal: Responses['account_withdrawal_content'] = [
        {
          tx_hash:
            '8804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cae',
          amount: '5000000',
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({
        data: singleWithdrawal,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountWithdrawals({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].txHash).toBe(
          Cardano.TransactionId(
            '8804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cae',
          ),
        );
        expect(result.value[0].amount).toEqual(BigNumber(BigInt('5000000')));
      }
    });

    it('should handle large withdrawal amounts', async () => {
      const largeWithdrawal: Responses['account_withdrawal_content'] = [
        {
          tx_hash:
            '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          amount: '999999999999999',
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({
        data: largeWithdrawal,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountWithdrawals({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].amount).toEqual(
          BigNumber(BigInt('999999999999999')),
        );
      }
    });
  });
});

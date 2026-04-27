import { Cardano } from '@cardano-sdk/core';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-sdk/util';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostDelegationsProvider } from '../../../src/blockfrost';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { HttpClient } from '@lace-lib/util-provider';

const rewardAccount = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

const mockDelegations: Responses['account_delegation_content'] = [
  {
    active_epoch: 350,
    tx_hash: '6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad',
    amount: '1000000',
    pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
  },
  {
    active_epoch: 351,
    tx_hash: '7804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99dae',
    amount: '1500000',
    pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
  },
];

describe('BlockfrostDelegationsProvider', () => {
  let provider: BlockfrostDelegationsProvider;
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
    } as unknown as HttpClient;

    provider = new BlockfrostDelegationsProvider(mockClient, dummyLogger);
  });

  describe('getAccountDelegations', () => {
    it('should return delegations for a reward account', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({
        data: mockDelegations,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountDelegations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].activeEpoch).toBe(350);
        expect(result.value[0].txHash).toBe(
          Cardano.TransactionId(
            '6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad',
          ),
        );
        expect(result.value[0].amount).toEqual(BigNumber(BigInt('1000000')));
        expect(result.value[0].poolId).toBe(
          Cardano.PoolId(
            'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
          ),
        );

        expect(result.value[1].activeEpoch).toBe(351);
        expect(result.value[1].txHash).toBe(
          Cardano.TransactionId(
            '7804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99dae',
          ),
        );
        expect(result.value[1].amount).toEqual(BigNumber(BigInt('1500000')));
        expect(result.value[1].poolId).toBe(
          Cardano.PoolId(
            'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
          ),
        );
      }
    });

    it('should return delegations for a single account with multiple pages', async () => {
      const createMockResponse = (fromEpoch: number, count = 100) => ({
        data: Array.from({ length: count }, (_, index) => ({
          active_epoch: fromEpoch - index,
          tx_hash: `6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99c${index
            .toString(16)
            .padStart(2, '0')}`,
          amount: '1000000',
          pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
        })),
        status: 200,
      });

      // Create mocked pages of delegations
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce(createMockResponse(350))
        .mockResolvedValueOnce(createMockResponse(250))
        .mockResolvedValueOnce(createMockResponse(150, 50));

      const result = await firstValueFrom(
        provider.getAccountDelegations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Check epochs of pages
        expect(result.value).toHaveLength(250);
        expect(result.value[0].activeEpoch).toBe(350);
        expect(result.value[99].activeEpoch).toBe(251);
        expect(result.value[100].activeEpoch).toBe(250);
        expect(result.value[199].activeEpoch).toBe(151);
        expect(result.value[200].activeEpoch).toBe(150);
        expect(result.value[249].activeEpoch).toBe(101);
      }
    });

    it('should handle empty delegations array', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({
        data: [],
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountDelegations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('API Error'));

      const result = await firstValueFrom(
        provider.getAccountDelegations({ rewardAccount }),
      );

      expect(result.isErr()).toBe(true);
    });

    it('should correctly map delegation data structure', async () => {
      const singleDelegation: Responses['account_delegation_content'] = [
        {
          active_epoch: 100,
          tx_hash:
            '8804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cae',
          amount: '5000000',
          pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({
        data: singleDelegation,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountDelegations({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual({
          activeEpoch: Cardano.EpochNo(100),
          txHash: Cardano.TransactionId(
            '8804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cae',
          ),
          amount: BigNumber(BigInt('5000000')),
          poolId: Cardano.PoolId(
            'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
          ),
        });
      }
    });
  });
});

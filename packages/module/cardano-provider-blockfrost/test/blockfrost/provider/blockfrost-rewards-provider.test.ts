import { Cardano } from '@cardano-sdk/core';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { HttpClientError } from '@lace-lib/util-provider';
import { BigNumber } from '@lace-sdk/util';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostRewardsProvider } from '../../../src/blockfrost';
import { mockResponses } from '../util';

import type { HttpClient } from '@lace-lib/util-provider';
import type { Mock } from 'vitest';

const mockRewards = [
  {
    epoch: 351,
    amount: '1000000',
    pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
  },
  {
    epoch: 350,
    amount: '1500000',
    pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
  },
];

const mockAccountContent = {
  stake_address:
    'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
  active: true,
  registered: true,
  active_epoch: 350,
  controlled_amount: '619154618165',
  rewards_sum: '319154618165',
  withdrawals_sum: '12125369253',
  reserves_sum: '0',
  treasury_sum: '0',
  withdrawable_amount: '307029248912',
  pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
  drep_id: null,
};

const rewardAccount = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

describe('BlockfrostRewardsProvider', () => {
  let provider: BlockfrostRewardsProvider;
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
    } as unknown as HttpClient;

    provider = new BlockfrostRewardsProvider(mockClient, dummyLogger);
  });

  describe('getAccountRewards', () => {
    it('should return rewards for a single account', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({
        data: mockRewards,
        status: 200,
      });

      const result = await firstValueFrom(
        provider.getAccountRewards({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].rewards).toBe('1000000');
        expect(result.value[1].rewards).toBe('1500000');
      }
    });

    it('should return rewards for a single account with multiple pages', async () => {
      const createMockResponse = (fromEpoch: number, count = 100) => ({
        data: Array.from({ length: count }, (_, index) => ({
          epoch: fromEpoch - index,
          amount: '1000000',
          pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
        })),
        status: 200,
      });

      // Create mocked pages of rewards
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce(createMockResponse(350))
        .mockResolvedValueOnce(createMockResponse(250))
        .mockResolvedValueOnce(createMockResponse(150, 50));

      const result = await firstValueFrom(
        provider.getAccountRewards({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Check epochs of pages
        expect(result.value).toHaveLength(250);
        expect(result.value[0].epoch).toBe(350);
        expect(result.value[99].epoch).toBe(251);
        expect(result.value[100].epoch).toBe(250);
        expect(result.value[199].epoch).toBe(151);
        expect(result.value[200].epoch).toBe(150);
        expect(result.value[249].epoch).toBe(101);
      }
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('API Error'));

      const result = await firstValueFrom(
        provider.getAccountRewards({ rewardAccount }),
      );

      expect(result.isErr()).toBe(true);
    });
  });

  describe('getRewardAccountInfo', () => {
    it('should return reward account info successfully with poolId when pool_id is present', async () => {
      mockResponses(vi.mocked(mockClient.request) as Mock, [
        [`accounts/${rewardAccount}`, { data: mockAccountContent }],
      ]);

      const result = await firstValueFrom(
        provider.getRewardAccountInfo({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isActive).toBe(true);
        expect(result.value.poolId).toBeDefined();
        expect(result.value.poolId).toEqual(
          Cardano.PoolId(
            'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
          ),
        );
        expect(result.value.rewardsSum).toEqual(
          BigNumber(BigInt('319154618165')),
        );
        expect(result.value.controlledAmount).toEqual(
          BigNumber(BigInt('619154618165')),
        );
        expect(result.value.withdrawableAmount).toEqual('307029248912');
      }
    });

    it('should return reward account info without poolId when pool_id is null', async () => {
      const mockAccountContentWithoutPool = {
        ...mockAccountContent,
        pool_id: null,
      };

      mockResponses(vi.mocked(mockClient.request) as Mock, [
        [`accounts/${rewardAccount}`, { data: mockAccountContentWithoutPool }],
      ]);

      const result = await firstValueFrom(
        provider.getRewardAccountInfo({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isActive).toBe(true);
        expect(result.value.poolId).toBeUndefined();
        expect(result.value.withdrawableAmount).toEqual('307029248912');
        expect(result.value.rewardsSum).toEqual(
          BigNumber(BigInt('319154618165')),
        );
        expect(result.value.controlledAmount).toEqual(
          BigNumber(BigInt('619154618165')),
        );
      }
    });

    it('should distinguish registered-but-undelegated: isActive false, isRegistered true', async () => {
      // registered=true, active=false: stake key is registered but not delegated to any pool
      const mockRegisteredNotDelegated = {
        ...mockAccountContent,
        registered: true,
        active: false,
        pool_id: null,
      };

      mockResponses(vi.mocked(mockClient.request) as Mock, [
        [`accounts/${rewardAccount}`, { data: mockRegisteredNotDelegated }],
      ]);

      const result = await firstValueFrom(
        provider.getRewardAccountInfo({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isActive).toBe(false);
        expect(result.value.isRegistered).toBe(true);
      }
    });

    it('should fall back to active for isRegistered when registered field is absent', async () => {
      const mockAccountContentWithoutRegistered = {
        ...mockAccountContent,
        registered: undefined,
      };

      mockResponses(vi.mocked(mockClient.request) as Mock, [
        [
          `accounts/${rewardAccount}`,
          { data: mockAccountContentWithoutRegistered },
        ],
      ]);

      const result = await firstValueFrom(
        provider.getRewardAccountInfo({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isActive).toBe(mockAccountContent.active);
        expect(result.value.isRegistered).toBe(mockAccountContent.active);
      }
    });

    it('should handle API errors gracefully', async () => {
      mockResponses(vi.mocked(mockClient.request) as Mock, [
        [
          `accounts/${rewardAccount}`,
          new HttpClientError(500, 'Internal Server Error'),
        ],
      ]);

      const result = await firstValueFrom(
        provider.getRewardAccountInfo({ rewardAccount }),
      );

      expect(result.isErr()).toBe(true);
    });

    it('should handle 404 not found as error', async () => {
      mockResponses(vi.mocked(mockClient.request) as Mock, [
        [`accounts/${rewardAccount}`, new HttpClientError(404, 'Not Found')],
      ]);

      const result = await firstValueFrom(
        provider.getRewardAccountInfo({ rewardAccount }),
      );

      expect(result.isErr()).toBe(true);
    });
  });
});

import { Cardano } from '@cardano-sdk/core';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import {
  measureRequestsUnderRetry,
  PERMANENT_STATUS,
  RETRIABLE_STATUS,
} from '@lace-lib/util-dev';
import {
  HttpClientError,
  PROVIDER_REQUEST_RETRY_CONFIG,
} from '@lace-lib/util-provider';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    it('should return no rewards when the account was never on-chain (404)', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(
        new HttpClientError(404, 'Not Found'),
      );

      const result = await firstValueFrom(
        provider.getAccountRewards({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('getAccountRewards under retry', () => {
    const issued: string[] = [];
    const firstPage = `accounts/${rewardAccount}/rewards?order=desc&page=1&count=100`;
    const secondPage = `accounts/${rewardAccount}/rewards?order=desc&page=2&count=100`;
    let respond: (endpoint: string) => Promise<{ data: unknown }>;
    let retryProvider: BlockfrostRewardsProvider;

    const recordingClient = {
      request: async (endpoint: string) => {
        issued.push(endpoint);
        return respond(endpoint);
      },
    } as unknown as HttpClient;

    beforeEach(() => {
      vi.useFakeTimers();
      issued.length = 0;
      retryProvider = new BlockfrostRewardsProvider(
        recordingClient,
        dummyLogger,
      );
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('re-issues its first page on every retry attempt', async () => {
      respond = async () => {
        throw new HttpClientError(RETRIABLE_STATUS, 'unhealthy');
      };

      const attempts = await measureRequestsUnderRetry({
        call: () => retryProvider.getAccountRewards({ rewardAccount }),
        requests: () => issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(Array.from({ length: 4 }, () => firstPage));
    });

    it('re-walks the pagination it had reached on every retry attempt', async () => {
      const fullPage = Array.from({ length: 100 }, (_, index) => ({
        epoch: 351 - index,
        amount: '1000000',
        pool_id: mockRewards[0].pool_id,
      }));
      respond = async endpoint => {
        if (endpoint.includes('page=1')) return { data: fullPage };
        throw new HttpClientError(RETRIABLE_STATUS, 'unhealthy');
      };

      const attempts = await measureRequestsUnderRetry({
        call: () => retryProvider.getAccountRewards({ rewardAccount }),
        requests: () => issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(
        Array.from({ length: 4 }, () => [firstPage, secondPage]).flat(),
      );
    });

    it('issues one request when the failure is permanent', async () => {
      respond = async () => {
        throw new HttpClientError(PERMANENT_STATUS, 'forbidden');
      };

      const attempts = await measureRequestsUnderRetry({
        call: () => retryProvider.getAccountRewards({ rewardAccount }),
        requests: () => issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([firstPage]);
    });

    it('issues one request when a 404 folds into no rewards', async () => {
      respond = async () => {
        throw new HttpClientError(404, 'Not Found');
      };

      const attempts = await measureRequestsUnderRetry({
        call: () => retryProvider.getAccountRewards({ rewardAccount }),
        requests: () => issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([firstPage]);
    });

    it('issues no request until something subscribes', async () => {
      respond = async () => {
        throw new HttpClientError(RETRIABLE_STATUS, 'unhealthy');
      };

      retryProvider.getAccountRewards({ rewardAccount });
      await vi.advanceTimersByTimeAsync(0);

      expect(issued).toEqual([]);
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

    it('should return never-active defaults when the account was never on-chain (404)', async () => {
      mockResponses(vi.mocked(mockClient.request) as Mock, [
        [`accounts/${rewardAccount}`, new HttpClientError(404, 'Not Found')],
      ]);

      const result = await firstValueFrom(
        provider.getRewardAccountInfo({ rewardAccount }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          isActive: false,
          isRegistered: false,
          rewardsSum: BigNumber(0n),
          withdrawableAmount: BigNumber(0n),
          controlledAmount: BigNumber(0n),
        });
      }
    });
  });
});

import { Cardano } from '@lace-lib/cardano-core';
import { vi } from 'vitest';

import { somePartialStakePools } from '../createStubStakePoolProvider';

import { rewardAccountBalance } from './mockData';

import type { RewardAccountInfoProvider } from '@lace-lib/cardano-core';
import type { Mocked } from 'vitest';

export const mockRewardAccountInfoProvider =
  (): Mocked<RewardAccountInfoProvider> => ({
    delegationPortfolio: vi.fn().mockResolvedValue(null),
    healthCheck: vi.fn().mockResolvedValue({ ok: true }),
    rewardAccountInfo: vi.fn().mockImplementation(
      address =>
        ({
          address,
          credentialStatus: Cardano.StakeCredentialStatus.Registered,
          delegatee: {
            currentEpoch: somePartialStakePools[0],
            nextEpoch: somePartialStakePools[0],
            nextNextEpoch: somePartialStakePools[0],
          },
          deposit: 2_000_000n,
          rewardBalance: rewardAccountBalance,
        } as Cardano.RewardAccountInfo),
    ),
  });

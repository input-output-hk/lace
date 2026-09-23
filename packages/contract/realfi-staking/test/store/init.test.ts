import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import store, { realfiPositionTransform } from '../../src/store/init';
import { RealFiPositionId } from '../../src/value-objects';

import type { RealFiStakeId } from '../../src/value-objects';
import type { Milliseconds } from '@lace-lib/util';

describe('realfi-staking store init', () => {
  it('returns reducers, side-effects, and position persistConfig', () => {
    const result = store({} as never, {} as never) as ReturnType<
      typeof store
    > & {
      reducers: object;
      sideEffects: unknown[];
      persistConfig: { realfiPosition: { whitelist: string[] } };
    };

    expect(Object.keys(result.reducers)).toEqual([
      'realfiFlow',
      'realfiPosition',
    ]);
    // M3–M8: stake/unstake quote → build → finalize flow side-effects.
    expect(result.sideEffects.length).toBeGreaterThan(0);
    expect(result.persistConfig.realfiPosition.whitelist).toEqual([
      'positionsByAccount',
      'yieldInfoByNetwork',
      'earnBasisRateByNetwork',
      'withdrawnActivitiesByAccount',
      'stakeActivitiesByAccount',
      'submittedOrderTxsByAccount',
      'hasSeenOnboarding',
      'rPointsByAccount',
      'laceBonusConsumedByAccount',
    ]);
  });

  it('transform strips pending operations from persisted positions', () => {
    const accountId = AccountId('acc-1');
    const positionsByAccount = {
      [accountId]: {
        positionId: RealFiPositionId(accountId),
        accountId,
        stakedSusdr: '1000',
        availableUsdr: '500',
        lastSuccessfulSync: 5 as Milliseconds,
        pendingStake: {
          stakeId: 's1' as RealFiStakeId,
          kind: 'stake' as const,
          principalUsdr: '500',
          startedAt: 1 as Milliseconds,
          availableAt: 2 as Milliseconds,
        },
      },
    };

    const out = realfiPositionTransform.in(
      positionsByAccount as never,
      'positionsByAccount',
      {} as never,
    ) as typeof positionsByAccount;

    expect(out[accountId].pendingStake).toBeUndefined();
    expect(out[accountId].stakedSusdr).toBe('1000');
    expect(out[accountId].lastSuccessfulSync).toBe(5);
  });
});

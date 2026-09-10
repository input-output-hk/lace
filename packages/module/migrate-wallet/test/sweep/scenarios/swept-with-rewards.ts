import {
  getUtxos,
  lovelaceTotal,
  withdrawableRewards,
} from '../../cardano/queries';
import { assertSweep, assertion } from '../assertions';
import { REWARDS_DREP } from '../rewards-config';
import { ensureStakedForRewards } from '../setup';

import { defineScenario } from './types';

/**
 * A registered source with withdrawable rewards, vote-delegated to abstain so the
 * single-tx sweep may withdraw them. The sweep moves UTxOs AND withdrawn rewards
 * to the destination and leaves the stake key registered (D2 mechanics 2).
 *
 * Preview only, and destructive: the withdrawal empties the wallet, so re-running
 * needs a fresh faucet-fund, re-stake, and ~4-day accrual. The rewards-withdrawable
 * assertion fails loud if rewards have not accrued yet.
 */
export const sweptWithRewardsScenario = defineScenario(
  {
    name: 'swept-with-rewards',
    description:
      'a source with withdrawable rewards is swept, rewards withdrawn, key left registered',
    sourceRole: 'rewards-source-abstain',
  },
  {
    stage: async ({ providers, source, network }) => {
      await ensureStakedForRewards(providers, {
        account: source,
        poolId: network.pool,
        dRep: REWARDS_DREP['rewards-source-abstain']!,
      });
      const sourceBefore = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      const rewardsWithdrawn = await withdrawableRewards(
        providers,
        source.rewardAccount,
      );
      return { sourceBefore, rewardsWithdrawn };
    },
    check: async (outcome, { providers, source, destination }, staged) => {
      if (outcome.kind !== 'swept') {
        return [
          assertion(`expected a swept outcome, got ${outcome.kind}`, false),
        ];
      }
      return [
        assertion(
          'rewards were withdrawable (accrued)',
          staged.rewardsWithdrawn > 0n,
        ),
        ...(await assertSweep(providers, {
          source: {
            address: source.address,
            rewardAccount: source.rewardAccount,
          },
          destination: { address: destination.address },
          txId: outcome.txId,
          sourceBefore: staged.sourceBefore,
          rewardsWithdrawn: staged.rewardsWithdrawn,
        })),
      ];
    },
  },
);

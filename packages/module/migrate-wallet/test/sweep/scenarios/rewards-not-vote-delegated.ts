import { getUtxos, lovelaceTotal } from '../../cardano/queries';
import { assertion, sourceUnchanged } from '../assertions';
import { REWARDS_DREP } from '../rewards-config';
import { ensureStakedForRewards } from '../setup';

import { defineScenario } from './types';

/**
 * A source holding withdrawable rewards that the single-tx sweep cannot move
 * (vote-delegated to a real DRep rather than abstain) is refused at discovery
 * with `rewards-not-vote-delegated`, moving nothing.
 *
 * Preview only. Non-destructive (a refusal moves nothing), so it is re-runnable
 * once staked and accrued. The refusal assertion fails loud until rewards accrue
 * (~4 days), since a zero balance would not be blocked.
 */
export const rewardsNotVoteDelegatedScenario = defineScenario(
  {
    name: 'rewards-not-vote-delegated',
    description:
      'a source with rewards vote-delegated to a real DRep (not abstain) is refused',
    sourceRole: 'rewards-source-blocked',
  },
  {
    stage: async ({ providers, source, network }) => {
      await ensureStakedForRewards(providers, {
        account: source,
        poolId: network.pool,
        dRep: REWARDS_DREP['rewards-source-blocked']!,
      });
      const sourceBefore = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      return { sourceBefore, rewardsWithdrawn: 0n };
    },
    check: async (outcome, { providers, source }, staged) => [
      assertion(
        'refused with rewards-not-vote-delegated',
        outcome.kind === 'unsupported' &&
          outcome.errorKey ===
            'migrate-wallet.error.rewards-not-vote-delegated',
      ),
      await sourceUnchanged(providers, source.address, staged.sourceBefore),
    ],
  },
);

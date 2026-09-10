import {
  getUtxos,
  lovelaceTotal,
  withdrawableRewards,
} from '../../cardano/queries';
import { assertion, assertSweep } from '../assertions';
import { setupSource } from '../setup';

import { defineScenario } from './types';

/**
 * Happy path: a funded, registered source is swept into the destination, and
 * the stake key is left registered. The reward-withdrawal path is not exercised
 * within one run (rewards need ~2 epochs to accrue).
 */
export const registeredSourceScenario = defineScenario(
  {
    name: 'registered-source',
    description: 'a funded, registered source is swept into the destination',
  },
  {
    stage: async ({ providers, source, treasury, network }) => {
      await setupSource(providers, { source, treasury }, network);
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
      return assertSweep(providers, {
        source: {
          address: source.address,
          rewardAccount: source.rewardAccount,
        },
        destination: { address: destination.address },
        txId: outcome.txId,
        sourceBefore: staged.sourceBefore,
        rewardsWithdrawn: staged.rewardsWithdrawn,
      });
    },
  },
);

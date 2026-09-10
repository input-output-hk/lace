import {
  getUtxos,
  lovelaceTotal,
  stakeKeyRegistered,
} from '../../cardano/queries';
import { returnFunds } from '../../cardano/tx';
import { pollUntil } from '../../util/poll';
import { assertion, sourceUnchanged } from '../assertions';
import { setupSource } from '../setup';

import { defineScenario } from './types';

/**
 * Case 3: a registered source with no spendable UTxO. `isRegistered` makes it
 * "have something to sweep", but with zero UTxOs there is no input to anchor the
 * fee, so no single-tx sweep exists and discovery refuses with
 * `no-spendable-input`, detected by UTxO count, before any build.
 */
export const noSpendableInputScenario = defineScenario(
  {
    name: 'no-spendable-input',
    description:
      'a registered source with no spendable UTxO is refused (case 3)',
  },
  {
    stage: async ({ providers, source, treasury, network }) => {
      // Ensure the key is registered (so the wallet "has something to sweep").
      // setupSource funds and registers only when needed.
      if (!(await stakeKeyRegistered(providers, source.rewardAccount))) {
        await setupSource(providers, { source, treasury }, network);
      }
      // Drain every UTxO to the treasury, leaving the registered key with nothing
      // spendable.
      if (lovelaceTotal(await getUtxos(providers, source.address)) > 0n) {
        console.log('  draining source to zero UTxOs');
        await returnFunds(providers, { from: source, to: treasury.address });
      }
      // Poll past indexer lag: reading straight after confirmation can still
      // see the spent utxos, so an unpolled count misreports what settled.
      const isDrained = await pollUntil(
        async () => (await getUtxos(providers, source.address)).length === 0,
      );
      if (!isDrained) {
        const remaining = await getUtxos(providers, source.address);
        throw new Error(
          `source not drained to zero (${remaining.length} utxo(s) left)`,
        );
      }
      console.log('  source registered with zero UTxOs');
      return { sourceBefore: 0n, rewardsWithdrawn: 0n };
    },
    check: async (outcome, { providers, source }, staged) => [
      assertion(
        'refused with no-spendable-input',
        outcome.kind === 'unsupported' &&
          outcome.errorKey === 'migrate-wallet.error.no-spendable-input',
      ),
      await sourceUnchanged(providers, source.address, staged.sourceBefore),
    ],
  },
);

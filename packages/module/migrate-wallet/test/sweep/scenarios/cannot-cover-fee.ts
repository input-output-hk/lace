import { LOVELACE_VALUE } from '@lace-contract/cardano-context';

import { getUtxos, lovelaceTotal } from '../../cardano/queries';
import { returnFunds, sendAda } from '../../cardano/tx';
import { assertion, sourceUnchanged } from '../assertions';

import { defineScenario } from './types';

const ada = (n: number): bigint =>
  BigInt(Math.round(n * Number(LOVELACE_VALUE)));

// A single sub-threshold UTxO: above min-ADA so it can exist as a UTxO, but too
// little to cover the sweep's fee plus its output's min-ADA (~1.14 ADA on
// preprod). Coin selection then throws InputSelectionError and discovery refuses
// with `cannot-cover-fee` (case 6). Tuned for preprod protocol params, if they
// shift, one live pass may need to re-tune DUST below the fee+min-ADA cutoff.
const DUST = ada(1);
// Any source balance at or below this is treated as the dust fixture already in
// place (a refused run leaves the dust behind, so it persists across runs).
const DUST_CEILING = ada(1.1);

/**
 * Case 6: an ADA-poor source whose single-tx sweep cannot cover the fee plus its
 * output's min-ADA. The real cardano-sdk balancer must throw an
 * InputSelectionError that discovery classifies into a `cannot-cover-fee`
 * refusal, the boundary the marble tests can only inject, not exercise.
 */
export const cannotCoverFeeScenario = defineScenario(
  {
    name: 'cannot-cover-fee',
    description:
      'an ADA-poor source is refused because the sweep cannot cover the fee plus min-ADA',
  },
  {
    stage: async ({ providers, source, treasury }) => {
      const balance = lovelaceTotal(await getUtxos(providers, source.address));
      if (balance > 0n && balance <= DUST_CEILING) {
        console.log(`  dust fixture ready (${balance})`);
      } else {
        if (balance > DUST_CEILING) {
          console.log(`  draining ${balance} to treasury before dusting`);
          await returnFunds(providers, { from: source, to: treasury.address });
        }
        console.log(`  funding dust ${DUST}`);
        await sendAda(providers, {
          from: treasury,
          to: source.address,
          lovelace: DUST,
        });
      }
      const sourceBefore = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      return { sourceBefore, rewardsWithdrawn: 0n };
    },
    check: async (outcome, { providers, source }, staged) => [
      assertion(
        'refused with cannot-cover-fee',
        outcome.kind === 'unsupported' &&
          outcome.errorKey === 'migrate-wallet.error.cannot-cover-fee',
      ),
      await sourceUnchanged(providers, source.address, staged.sourceBefore),
    ],
  },
);

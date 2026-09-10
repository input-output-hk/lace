import {
  confirmedTxFee,
  getUtxos,
  lovelaceTotal,
  stakeKeyRegistered,
} from '../../cardano/queries';
import { sendAda } from '../../cardano/tx';
import {
  assertion,
  destinationReceived,
  sourceEmptied,
  valueConserved,
} from '../assertions';
import { FUND_AMOUNT, MIN_SOURCE_BALANCE } from '../setup';

import { defineScenario } from './types';

/**
 * A funded but never-staked source (the common "import a wallet that never
 * delegated" case). Its reward account 404s (NEVER_ACTIVE), so discovery must
 * proceed and the sweep must move the UTxOs with no withdrawal and no
 * deregistration. Uses an isolated seed so it can be left unregistered, unlike
 * the shared source which setupSource registers.
 */
export const unregisteredSourceScenario = defineScenario(
  {
    name: 'unregistered-source',
    description:
      'a funded but never-staked source is swept, no withdrawal or dereg',
    sourceRole: 'unregistered-source',
  },
  {
    stage: async ({ providers, source, treasury }) => {
      const balance = lovelaceTotal(await getUtxos(providers, source.address));
      if (balance < MIN_SOURCE_BALANCE) {
        console.log(`  funding unregistered source (${FUND_AMOUNT})`);
        await sendAda(providers, {
          from: treasury,
          to: source.address,
          lovelace: FUND_AMOUNT,
        });
      } else {
        console.log(`  unregistered source funded (${balance})`);
      }
      const sourceBefore = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      return { sourceBefore, rewardsWithdrawn: 0n };
    },
    check: async (outcome, { providers, source, destination }, staged) => {
      if (outcome.kind !== 'swept') {
        return [
          assertion(`expected a swept outcome, got ${outcome.kind}`, false),
        ];
      }
      const emptied = await sourceEmptied(providers, source.address);
      const { result: received, received: receivedAmount } =
        await destinationReceived(providers, destination.address, outcome.txId);
      const fee = await confirmedTxFee(providers, outcome.txId);
      const neverRegistered = assertion(
        'source stake key never registered',
        !(await stakeKeyRegistered(providers, source.rewardAccount)),
      );
      return [
        emptied,
        neverRegistered,
        received,
        valueConserved({
          sourceBefore: staged.sourceBefore,
          rewardsWithdrawn: staged.rewardsWithdrawn,
          received: receivedAmount,
          fee,
        }),
      ];
    },
  },
);

import { deriveTestAccount } from '../../cardano/account';
import {
  confirmedTxFee,
  getUtxos,
  lovelaceTotal,
  withdrawableRewards,
} from '../../cardano/queries';
import { sendAda } from '../../cardano/tx';
import { pollUntil } from '../../util/poll';
import { assertion, destinationReceived, valueConserved } from '../assertions';
import { ADA, setupSource } from '../setup';

import { defineScenario } from './types';

const ACCOUNT_1_MIN = ADA(2);
const ACCOUNT_1_FUND = ADA(5);

/**
 * Multi-account: a source funded on account 0 AND account 1 is swept in ONE tx,
 * both accounts emptied into the destination. The scan finds account 1, the
 * collect merges it into the flat set, and the multi-account signer witnesses
 * both accounts' inputs.
 *
 * `stage`'s `sourceBefore` is the COMBINED account 0 plus account 1 balance
 * (StagedSource has one before-total, shared across all scenarios), so `check`'s
 * conservation identity covers the whole multi-account union, not just account 0.
 * Account 0 is staked by `setupSource` (abstain vote-delegated), so it accrues
 * withdrawable rewards the sweep withdraws. Account 1 is never staked here, so
 * its reward term is 0. Without the rewards term the conservation identity would
 * intermittently false-fail whenever account 0 carries pre-existing rewards into
 * a run.
 */
export const sweptMultiAccountScenario = defineScenario(
  {
    name: 'swept-multi-account',
    description: 'a source funded on accounts 0 and 1 is swept in one tx',
  },
  {
    stage: async ({ providers, source, treasury, network }) => {
      await setupSource(providers, { source, treasury }, network);

      const account1 = await deriveTestAccount({
        mnemonic: source.mnemonic,
        accountIndex: 1,
        chainId: source.chainId,
      });
      const account1Balance = lovelaceTotal(
        await getUtxos(providers, account1.address),
      );
      if (account1Balance < ACCOUNT_1_MIN) {
        console.log(`  funding source account 1 (${ACCOUNT_1_FUND})`);
        await sendAda(providers, {
          from: treasury,
          to: account1.address,
          lovelace: ACCOUNT_1_FUND,
        });
        await pollUntil(
          async () =>
            lovelaceTotal(await getUtxos(providers, account1.address)) > 0n,
          'source account 1 utxo not indexed after funding',
        );
      } else {
        console.log(`  source account 1 already funded (${account1Balance})`);
      }

      const account0Before = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      const account1Before = lovelaceTotal(
        await getUtxos(providers, account1.address),
      );
      const rewardsWithdrawn = await withdrawableRewards(
        providers,
        source.rewardAccount,
      );
      return {
        sourceBefore: account0Before + account1Before,
        rewardsWithdrawn,
      };
    },
    check: async (outcome, { providers, source, destination }, staged) => {
      if (outcome.kind !== 'swept') {
        return [
          assertion(`expected a swept outcome, got ${outcome.kind}`, false),
        ];
      }
      const account1 = await deriveTestAccount({
        mnemonic: source.mnemonic,
        accountIndex: 1,
        chainId: source.chainId,
      });
      // Poll past indexer lag: the production submit returns a txId without
      // waiting for confirmation.
      const isAccount0Emptied = await pollUntil(
        async () => (await getUtxos(providers, source.address)).length === 0,
      );
      const isAccount1Emptied = await pollUntil(
        async () => (await getUtxos(providers, account1.address)).length === 0,
      );
      const { result: destinationResult, received } = await destinationReceived(
        providers,
        destination.address,
        outcome.txId,
      );
      const fee = await confirmedTxFee(providers, outcome.txId);
      return [
        assertion('account 0 emptied (0 utxos)', isAccount0Emptied),
        assertion('account 1 emptied (0 utxos)', isAccount1Emptied),
        destinationResult,
        valueConserved({
          sourceBefore: staged.sourceBefore,
          rewardsWithdrawn: staged.rewardsWithdrawn,
          received,
          fee,
        }),
      ];
    },
  },
);

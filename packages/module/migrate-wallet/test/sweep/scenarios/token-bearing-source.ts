import { mintTestTokenTo, testAssetId } from '../../cardano/mint';
import {
  getUtxos,
  lovelaceTotal,
  withdrawableRewards,
} from '../../cardano/queries';
import { assertion, assertSweep, destinationHoldsToken } from '../assertions';
import { setupSource } from '../setup';

import { defineScenario } from './types';

import type { StagedSource } from './types';
import type { Providers } from '../../cardano/queries';
import type { Cardano } from '@cardano-sdk/core';

const TOKEN_NAME = 'LACETEST';
const TOKEN_QUANTITY = 1_000n;

const tokenHeld = async (
  providers: Providers,
  address: Cardano.PaymentAddress,
): Promise<bigint> => {
  const assetId = testAssetId(TOKEN_NAME);
  const utxos = await getUtxos(providers, address);
  return utxos.reduce(
    (total, [, out]) => total + (out.value.assets?.get(assetId) ?? 0n),
    0n,
  );
};

type TokenStaged = StagedSource & { tokensBefore: bigint };

/**
 * A registered source that also holds a native token. The sweep must carry the
 * token (not just ADA) into the destination change output — an untested path,
 * since every other scenario funds ADA only. Mints the token to the source if
 * absent so the run is self-healing.
 */
export const tokenBearingSourceScenario = defineScenario<TokenStaged>(
  {
    name: 'token-bearing-source',
    description:
      'a source holding a native token is swept, token and ADA land at the destination',
  },
  {
    stage: async ({ providers, source, treasury, network }) => {
      await setupSource(providers, { source, treasury }, network);
      if ((await tokenHeld(providers, source.address)) < TOKEN_QUANTITY) {
        console.log(`  minting ${TOKEN_QUANTITY} test token(s) to source`);
        await mintTestTokenTo(providers, {
          minter: treasury,
          to: source.address,
          assetName: TOKEN_NAME,
          quantity: TOKEN_QUANTITY,
        });
      } else {
        console.log('  source already holds the test token');
      }
      const sourceBefore = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      const rewardsWithdrawn = await withdrawableRewards(
        providers,
        source.rewardAccount,
      );
      // The amount actually present when the sweep runs, which the self-heal
      // top-up can carry above TOKEN_QUANTITY on a residual from an interrupted
      // run. The destination must receive exactly this, not the mint constant.
      const tokensBefore = await tokenHeld(providers, source.address);
      return { sourceBefore, rewardsWithdrawn, tokensBefore };
    },
    check: async (outcome, { providers, source, destination }, staged) => {
      if (outcome.kind !== 'swept') {
        return [
          assertion(`expected a swept outcome, got ${outcome.kind}`, false),
        ];
      }
      const sweepAssertions = await assertSweep(providers, {
        source: {
          address: source.address,
          rewardAccount: source.rewardAccount,
        },
        destination: { address: destination.address },
        txId: outcome.txId,
        sourceBefore: staged.sourceBefore,
        rewardsWithdrawn: staged.rewardsWithdrawn,
      });
      const tokenReceived = await destinationHoldsToken(providers, {
        address: destination.address,
        txId: outcome.txId,
        assetId: testAssetId(TOKEN_NAME),
        expected: staged.tokensBefore,
      });
      return [...sweepAssertions, tokenReceived];
    },
  },
);

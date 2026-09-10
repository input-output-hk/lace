import { Cardano } from '@cardano-sdk/core';

import {
  mintMultiPolicyAssetBatch,
  testAssetId,
  testAssetId2,
} from '../../cardano/mint';
import {
  getUtxos,
  lovelaceTotal,
  withdrawableRewards,
} from '../../cardano/queries';
import { assertion, assertSweep, destinationHoldsAssets } from '../assertions';
import { setupSource } from '../setup';

import { defineScenario } from './types';

import type { StagedSource } from './types';
import type { Providers } from '../../cardano/queries';
import type { AssetQuantity } from '../assertions';

// Each name is minted under both test policies, so the bundle holds pairs that
// differ only by policy id. A sweep keying assets by name alone collapses a
// pair and half the bundle never arrives.
const ASSET_NAMES = ['multipol-1', 'multipol-2'];
const BUNDLE_ASSET_IDS = ASSET_NAMES.flatMap(name => [
  testAssetId(name),
  testAssetId2(name),
]);
// Rides with the minted output: covers the min-ADA of a four-asset, two-policy
// bundle (far under maxValueSize) with headroom.
const BUNDLE_OUTPUT_LOVELACE = 3_000_000n;

/**
 * Every native asset the address holds, summed per asset id from the UTxO set's
 * own token maps. An asset that no constant names is therefore still carried
 * into the expectation, and the policy count taken from these keys is a
 * measurement.
 */
const assetsHeld = async (
  providers: Providers,
  address: Cardano.PaymentAddress,
): Promise<AssetQuantity[]> => {
  const totals = new Map<Cardano.AssetId, bigint>();
  for (const [, out] of await getUtxos(providers, address)) {
    for (const [assetId, quantity] of out.value.assets ?? []) {
      totals.set(assetId, (totals.get(assetId) ?? 0n) + quantity);
    }
  }
  return [...totals].map(([assetId, quantity]) => ({ assetId, quantity }));
};

const policiesOf = (assets: AssetQuantity[]): Set<string> =>
  new Set(
    assets.map(({ assetId }) => String(Cardano.AssetId.getPolicyId(assetId))),
  );

type MultiPolicyStaged = StagedSource & { bundleBefore: AssetQuantity[] };

/**
 * A registered source holding native assets under two distinct policies. The
 * sweep must carry every asset of every policy into the destination change
 * output, the shape most likely to expose a value-assembly bug.
 * `token-bearing-source` covers a single policy, and `sweep-too-large` stages
 * many assets but is refused before any sweep, so this is the only scenario
 * that carries a multi-policy bundle through a sweep. Mints the bundle when it
 * is absent so the run is self-healing.
 */
export const multiPolicySourceScenario = defineScenario<MultiPolicyStaged>(
  {
    name: 'multi-policy-source',
    description:
      'a source holding assets under two policies is swept, every asset lands at the destination',
  },
  {
    stage: async ({ providers, source, treasury, network }) => {
      await setupSource(providers, { source, treasury }, network);
      const held = await assetsHeld(providers, source.address);
      const heldIds = new Set(held.map(({ assetId }) => String(assetId)));
      if (BUNDLE_ASSET_IDS.some(assetId => !heldIds.has(String(assetId)))) {
        console.log(
          `  minting ${BUNDLE_ASSET_IDS.length} test assets across two policies to source`,
        );
        await mintMultiPolicyAssetBatch(providers, {
          minter: treasury,
          to: source.address,
          assetNames: ASSET_NAMES,
          outputLovelace: BUNDLE_OUTPUT_LOVELACE,
        });
      } else {
        console.log('  source already holds the multi-policy bundle');
      }
      const sourceBefore = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      const rewardsWithdrawn = await withdrawableRewards(
        providers,
        source.rewardAccount,
      );
      // What the source actually carries into the sweep: a partial residual
      // from an interrupted run makes the re-mint push some quantities above
      // one, and the destination must receive exactly this, not one per asset.
      const bundleBefore = await assetsHeld(providers, source.address);
      console.log(
        `  source holds ${bundleBefore.length} assets across ${
          policiesOf(bundleBefore).size
        } policies`,
      );
      return { sourceBefore, rewardsWithdrawn, bundleBefore };
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
      // Guards against a vacuous pass: a bundle measured at fewer than two
      // policies makes every asset check below a single-policy repeat of
      // token-bearing-source.
      const policies = policiesOf(staged.bundleBefore);
      const bundleStaged = assertion(
        `source staged ${staged.bundleBefore.length} assets across ${policies.size} policies`,
        staged.bundleBefore.length >= BUNDLE_ASSET_IDS.length &&
          policies.size >= 2,
      );
      const assetsReceived = await destinationHoldsAssets(providers, {
        address: destination.address,
        txId: outcome.txId,
        expected: staged.bundleBefore,
      });
      return [...sweepAssertions, bundleStaged, ...assetsReceived];
    },
  },
);

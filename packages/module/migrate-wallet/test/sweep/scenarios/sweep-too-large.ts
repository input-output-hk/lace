import { Cardano } from '@cardano-sdk/core';

import {
  TEST_TOKEN_POLICY_ID,
  mintTestAssetBatch,
  testAssetId,
} from '../../cardano/mint';
import { getUtxos, lovelaceTotal } from '../../cardano/queries';
import { assertion, sourceUnchanged } from '../assertions';

import { defineScenario } from './types';

import type { Providers } from '../../cardano/queries';

// Enough distinct 32-byte-named assets that the sweep, which combines them all
// into the destination change, serialises past maxTxSize (16384). Batched under
// maxValueSize (5000), each batch a separate source UTxO.
const TARGET_ASSET_COUNT = 600;
const BATCH_SIZE = 90;
// Rides with each minted batch: covers that output's min-ADA and leaves the
// source enough ADA to cover the large sweep fee, so the build succeeds and the
// size check (not cannot-cover-fee) is what refuses.
const BATCH_OUTPUT_LOVELACE = 20_000_000n;

// 32 bytes (the asset-name max), so fewer assets are needed to blow the size.
const assetName = (index: number): string =>
  `ovsz-${String(index).padStart(4, '0')}`.padEnd(32, '0');

const heldTestAssetIds = async (
  providers: Providers,
  address: Cardano.PaymentAddress,
): Promise<Set<string>> => {
  const utxos = await getUtxos(providers, address);
  const ids = new Set<string>();
  for (const [, out] of utxos) {
    for (const id of out.value.assets?.keys() ?? []) {
      if (Cardano.AssetId.getPolicyId(id) === TEST_TOKEN_POLICY_ID) {
        ids.add(String(id));
      }
    }
  }
  return ids;
};

/**
 * Case 1: a source so asset-heavy that the single-tx sweep would exceed
 * maxTxSize. build() does not enforce the cap, so only submit would reject it, and
 * discovery refuses `sweep-too-large` instead of looping on retry. Uses an
 * isolated seed so the bloat never makes other scenarios refuse.
 */
export const sweepTooLargeScenario = defineScenario(
  {
    name: 'sweep-too-large',
    description:
      'an asset-heavy source whose sweep exceeds maxTxSize is refused',
    sourceRole: 'oversize-source',
  },
  {
    stage: async ({ providers, source, treasury }) => {
      const held = await heldTestAssetIds(providers, source.address);
      const missing = Array.from({ length: TARGET_ASSET_COUNT }, (_, index) =>
        assetName(index),
      ).filter(name => !held.has(String(testAssetId(name))));

      if (missing.length > 0) {
        console.log(
          `  minting ${missing.length} test asset(s) in batches of ${BATCH_SIZE}`,
        );
        // Chain each batch's change into the next so back-to-back mints never
        // race on the treasury's indexer-lagged UTxO set.
        let input: Cardano.Utxo | undefined;
        for (let start = 0; start < missing.length; start += BATCH_SIZE) {
          const { change } = await mintTestAssetBatch(providers, {
            minter: treasury,
            to: source.address,
            assetNames: missing.slice(start, start + BATCH_SIZE),
            outputLovelace: BATCH_OUTPUT_LOVELACE,
            input,
          });
          input = change;
        }
      } else {
        console.log(`  source already holds ${TARGET_ASSET_COUNT} test assets`);
      }

      const sourceBefore = lovelaceTotal(
        await getUtxos(providers, source.address),
      );
      return { sourceBefore, rewardsWithdrawn: 0n };
    },
    check: async (outcome, { providers, source }, staged) => [
      assertion(
        'refused with sweep-too-large',
        outcome.kind === 'unsupported' &&
          outcome.errorKey === 'migrate-wallet.error.sweep-too-large',
      ),
      await sourceUnchanged(providers, source.address, staged.sourceBefore),
    ],
  },
);

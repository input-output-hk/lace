import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { InputSelectionError } from '../../src/input-selection/InputSelectionError';
import { LargeFirstCoinSelector } from '../../src/input-selection/LargeFirstCoinSelector';
import { RoundRobinRandomCoinSelector } from '../../src/input-selection/RoundRobinRandomCoinSelector';

import {
  assertChangeCountMimicsOutputs,
  assertCoinSelectorProperties,
  assertFailureProperties,
} from './property/assertions';
import {
  coinSelectorPropertyInput,
  regressionExamples,
} from './property/generators';

import type { InputSelectionFailure } from '../../src/input-selection/InputSelectionError';
import type {
  CoinSelector,
  CoinSelectorParams,
  CoinSelectorResult,
} from '../../src/input-selection/types';

/**
 * Runs per property; override for deep local or scheduled sweeps, e.g.
 * `COIN_SELECTOR_PROPERTY_RUNS=1000000`. The test timeout scales with it; the
 * floor absorbs slow shared CI runners, where the default 500 runs have been
 * observed to take over 8 seconds.
 */
const NUM_RUNS = Number(process.env.COIN_SELECTOR_PROPERTY_RUNS ?? 500);
const TEST_TIMEOUT = Math.max(60_000, NUM_RUNS * 10);

const configurations: Array<{
  name: string;
  createSelector: (seed: bigint) => CoinSelector;
  shouldMimicOutputShape: boolean;
}> = [
  {
    name: 'LargeFirstCoinSelector',
    createSelector: () => new LargeFirstCoinSelector(),
    shouldMimicOutputShape: false,
  },
  {
    name: 'RoundRobinRandomCoinSelector (optimal)',
    createSelector: seed =>
      new RoundRobinRandomCoinSelector({ seed, strategy: 'optimal' }),
    shouldMimicOutputShape: true,
  },
  {
    name: 'RoundRobinRandomCoinSelector (minimal)',
    createSelector: seed =>
      new RoundRobinRandomCoinSelector({ seed, strategy: 'minimal' }),
    shouldMimicOutputShape: true,
  },
];

const selectOrFailure = (
  selector: CoinSelector,
  params: CoinSelectorParams,
): CoinSelectorResult | InputSelectionFailure => {
  try {
    return selector.select(params);
  } catch (error) {
    if (!(error instanceof InputSelectionError)) throw error;
    return error.failure;
  }
};

describe('CoinSelector properties', () => {
  for (const {
    name,
    createSelector,
    shouldMimicOutputShape,
  } of configurations) {
    it(
      `${name} satisfies the selection and failure properties`,
      () => {
        let mimicLawApplications = 0;
        fc.assert(
          fc.property(coinSelectorPropertyInput, ({ params, seed }) => {
            try {
              const result = createSelector(seed).select(params);
              assertCoinSelectorProperties(params, result);
              if (
                shouldMimicOutputShape &&
                assertChangeCountMimicsOutputs(params, result)
              ) {
                mimicLawApplications += 1;
              }
            } catch (error) {
              if (!(error instanceof InputSelectionError)) throw error;
              assertFailureProperties(params, error, () =>
                createSelector(seed),
              );
            }
          }),
          {
            examples: regressionExamples.map(example => [example]),
            numRuns: NUM_RUNS,
            verbose: true,
          },
        );
        if (shouldMimicOutputShape) {
          expect(mimicLawApplications).toBeGreaterThan(0);
        }
      },
      TEST_TIMEOUT,
    );
  }

  it(
    'RoundRobinRandomCoinSelector returns identical results for identical params and seed',
    () => {
      fc.assert(
        fc.property(coinSelectorPropertyInput, ({ params, seed }) => {
          const selector = new RoundRobinRandomCoinSelector({ seed });
          const first = selectOrFailure(selector, params);
          const second = selectOrFailure(selector, params);
          const separateInstance = selectOrFailure(
            new RoundRobinRandomCoinSelector({ seed }),
            params,
          );
          expect(second).toEqual(first);
          expect(separateInstance).toEqual(first);
        }),
        { numRuns: NUM_RUNS, verbose: true },
      );
    },
    TEST_TIMEOUT,
  );
});

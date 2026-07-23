import { generateChangeWithRetries } from './round-robin-random/change';
import { entropySeed, SplitMix64 } from './round-robin-random/rng';
import { runSelectionPhase } from './round-robin-random/round-robin';
import { SelectionIndex } from './round-robin-random/selection-index';

import type {
  CoinSelector,
  CoinSelectorParams,
  CoinSelectorResult,
} from './types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * How aggressively the selector accumulates value beyond the minimum:
 * - `optimal` improves each requirement toward twice its minimum, producing
 *   change that resembles a typical payment and keeps the UTxO set healthy.
 * - `minimal` stops as soon as every minimum is met, selecting fewer inputs.
 */
export type SelectionStrategy = 'minimal' | 'optimal';

/** Options for {@link RoundRobinRandomCoinSelector}. */
export type RoundRobinRandomCoinSelectorOptions = {
  /**
   * Seed for the deterministic random number generator. Defaults to platform
   * entropy. The generator is re-seeded from this value on every
   * {@link RoundRobinRandomCoinSelector.select} call, so repeated calls with
   * identical inputs make identical choices.
   */
  seed?: bigint;
  /** The selection strategy. Defaults to `optimal`. */
  strategy?: SelectionStrategy;
};

const OPTIMAL_TARGET_MULTIPLIER = 2n;
const MINIMAL_TARGET_MULTIPLIER = 1n;

const utxoKey = ([input]: Cardano.Utxo): string =>
  `${input.txId}:${input.index}`;

/**
 * Implements the **Round-Robin Random-Improve** coin selection strategy, a
 * port of the algorithm specified in CIP-2 and refined by
 * cardano-foundation/cardano-coin-selection.
 *
 * Requirements (one per required asset, plus lovelace last) take turns
 * picking a random UTxO each: any pick is accepted while a requirement is
 * below its minimum, and afterwards only picks moving it closer to the
 * strategy's improvement target are kept. Random picks prefer UTxOs with few
 * assets, so dust is consumed proportionally to its prevalence.
 *
 * The surplus is returned as min-ADA compliant change outputs that mimic the
 * shape of the payment outputs (`outputsToCover`): one change output per
 * payment output where possible, with user-specified assets and leftover ada
 * distributed proportionally to each output's quantities. Funding the change
 * min-ADA may pull extra UTxOs into the selection.
 *
 * @remarks
 * - Deterministic for a fixed seed: the RNG is re-seeded on every `select`
 *   call, so the fee-convergence iterations of the balancing loop see the
 *   same choices for the same inputs.
 * - Pre-selected UTxOs (`preSelectedUtxo`) are always preserved and counted
 *   toward every requirement.
 *
 * @throws {InputSelectionError} `BalanceInsufficient` when a required asset
 *   or ADA cannot be covered; `UtxoFullyDepleted` when the pool runs out
 *   while funding the change min-ADA.
 */
export class RoundRobinRandomCoinSelector implements CoinSelector {
  private readonly seed: bigint;
  private readonly targetMultiplier: bigint;

  public constructor(options: RoundRobinRandomCoinSelectorOptions = {}) {
    this.seed = options.seed ?? entropySeed();
    this.targetMultiplier =
      options.strategy === 'minimal'
        ? MINIMAL_TARGET_MULTIPLIER
        : OPTIMAL_TARGET_MULTIPLIER;
  }

  /**
   * Executes the coin selection process.
   *
   * @param params - See {@link CoinSelectorParams}.
   * @returns The selected UTxOs, the remaining available ones, and the change outputs.
   */
  public select({
    preSelectedUtxo,
    availableUtxo,
    targetValue,
    outputsToCover,
    changeAddress,
    protocolParameters,
  }: CoinSelectorParams): CoinSelectorResult {
    const rng = new SplitMix64(this.seed);

    const preSelected = preSelectedUtxo ?? [];
    const preSelectedKeys = new Set(preSelected.map(utxoKey));
    const pool = [
      ...preSelected,
      ...availableUtxo.filter(utxo => !preSelectedKeys.has(utxoKey(utxo))),
    ];

    const index = new SelectionIndex(pool, preSelected.length, targetValue);
    runSelectionPhase(index, rng, this.targetMultiplier);

    const selection = index.selectedUtxos();
    const changeOutputs = generateChangeWithRetries(
      {
        selection,
        targetValue,
        outputsToCover,
        changeAddress,
        protocolParameters,
      },
      () => index.pickUtxoForChange(rng),
      pool.length,
    );

    return { selection, remaining: index.unselectedUtxos(), changeOutputs };
  }
}

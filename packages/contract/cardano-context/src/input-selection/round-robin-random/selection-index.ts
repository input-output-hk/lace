import type { SplitMix64 } from './rng';
import type { Cardano } from '@cardano-sdk/core';

/**
 * Candidate priority tiers, from most to least preferred: UTxOs whose total
 * asset count (lovelace included) is exactly one, exactly two, and any.
 * Preferring low asset counts consumes dust and singleton bundles first,
 * which keeps change outputs small and improves overall UTxO set health.
 */
type Tier = 0 | 1 | 2;

const TIERS: readonly Tier[] = [0, 1, 2];
const ANY_TIER: Tier = 2;

type SelectionPick = {
  poolIndex: number;
  processorIndex: number;
  tier: Tier;
};

/**
 * A selection requirement tracked by the index: one per asset required by the
 * target, plus one for lovelace (with an undefined asset id), placed last.
 */
export type SelectionProcessor = {
  /** The required asset, or `undefined` for the lovelace processor. */
  assetId?: Cardano.AssetId;
  /** The quantity the selection must reach. */
  minimum: bigint;
  /** Cleared by the round robin when a step fails to improve the selection. */
  isActive: boolean;
  /** Running total of the quantity held by the selected pool entries. */
  selectedTotal: bigint;
  /** Total quantity held by the entire pool, for sufficiency checks. */
  poolTotal: bigint;
  /**
   * Candidate pool entries by priority tier. Buckets use lazy deletion:
   * entries already selected by another requirement are dropped when drawn.
   */
  buckets: [number[], number[], number[]];
};

const quantityOf = (
  value: Cardano.Value,
  assetId: Cardano.AssetId | undefined,
): bigint => (assetId ? value.assets?.get(assetId) ?? 0n : value.coins);

/**
 * A per-selection index over the UTxO pool, providing constant-time selected
 * quantity queries and cheap randomized picks by priority tier.
 *
 * Caches, for every pool entry, its total asset count and its quantity of
 * every requirement's asset, so the selection loop never re-derives asset
 * maps from values. Picks are recorded so the most recent one can be undone.
 */
export class SelectionIndex {
  public readonly processors: SelectionProcessor[];
  public readonly preSelectedCount: number;
  private readonly pool: Cardano.Utxo[];
  private readonly poolSelected: boolean[];
  private readonly poolQuantities: bigint[][];
  private readonly picks: SelectionPick[] = [];

  /**
   * Builds the index for a target and a UTxO pool.
   *
   * @param pool - The full pool, with the pre-selected entries first. The
   *   pre-selected entries are marked selected up front and seed the running
   *   totals of every processor.
   * @param preSelectedCount - How many leading pool entries are pre-selected.
   * @param targetValue - The value the selection must cover. Only positive
   *   asset quantities become processors; negative quantities are implicit
   *   inputs that surface later, in change generation.
   */
  public constructor(
    pool: Cardano.Utxo[],
    preSelectedCount: number,
    targetValue: Cardano.Value,
  ) {
    this.pool = pool;
    this.preSelectedCount = preSelectedCount;
    this.poolSelected = pool.map(() => false);

    this.processors = [...(targetValue.assets?.entries() ?? [])]
      .filter(([, quantity]) => quantity > 0n)
      .map(([assetId, quantity]) =>
        SelectionIndex.createProcessor(assetId, quantity),
      );
    this.processors.push(
      SelectionIndex.createProcessor(
        undefined,
        targetValue.coins > 0n ? targetValue.coins : 0n,
      ),
    );

    this.poolQuantities = pool.map(([, output], poolIndex) => {
      const assetCount = (output.value.assets?.size ?? 0) + 1;
      const tier: Tier = assetCount === 1 ? 0 : assetCount === 2 ? 1 : 2;
      return this.processors.map(processor => {
        const quantity = quantityOf(output.value, processor.assetId);
        if (quantity > 0n) {
          processor.poolTotal += quantity;
          processor.buckets[tier].push(poolIndex);
          if (tier !== ANY_TIER) processor.buckets[ANY_TIER].push(poolIndex);
        }
        return quantity;
      });
    });

    for (let poolIndex = 0; poolIndex < preSelectedCount; poolIndex++) {
      this.poolSelected[poolIndex] = true;
      this.applyToTotals(poolIndex, true);
    }
  }

  /** The processor tracking lovelace, always processed last. */
  public get lovelaceProcessorIndex(): number {
    return this.processors.length - 1;
  }

  /** How many pool entries have been picked (pre-selected ones excluded). */
  public get pickCount(): number {
    return this.picks.length;
  }

  private static createProcessor(
    assetId: Cardano.AssetId | undefined,
    minimum: bigint,
  ): SelectionProcessor {
    return {
      assetId,
      minimum,
      isActive: true,
      selectedTotal: 0n,
      poolTotal: 0n,
      buckets: [[], [], []],
    };
  }

  /**
   * Picks a random unselected pool entry for the given processor, preferring
   * entries with fewer assets (tiers: singleton, pair, any). On success the
   * entry is marked selected, every processor's running total is updated,
   * and the pick is recorded so it can be undone.
   *
   * @param rng - The random number generator driving the tier draws.
   * @param processorIndex - The requirement to pick for.
   * @returns `true` if an entry was picked, `false` if no unselected entry
   *   holds the processor's asset.
   */
  public pick(rng: SplitMix64, processorIndex: number): boolean {
    const processor = this.processors[processorIndex];

    for (const tier of TIERS) {
      const bucket = processor.buckets[tier];
      while (bucket.length > 0) {
        const slot = rng.below(bucket.length);
        const poolIndex = bucket[slot];
        bucket[slot] = bucket[bucket.length - 1];
        bucket.pop();

        if (!this.poolSelected[poolIndex]) {
          this.picks.push({ poolIndex, processorIndex, tier });
          this.poolSelected[poolIndex] = true;
          this.applyToTotals(poolIndex, true);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Undoes the most recent pick: unmarks the entry, restores the running
   * totals and returns the entry to the bucket it was picked from.
   */
  public undoLastPick(): void {
    const pick = this.picks.pop();
    if (!pick) return;

    this.poolSelected[pick.poolIndex] = false;
    this.applyToTotals(pick.poolIndex, false);
    this.processors[pick.processorIndex].buckets[pick.tier].push(
      pick.poolIndex,
    );
  }

  /**
   * Picks one additional lovelace-bearing entry for change construction.
   *
   * @param rng - The random number generator driving the pick.
   * @returns The picked UTxO, or `undefined` when the pool is exhausted.
   */
  public pickUtxoForChange(rng: SplitMix64): Cardano.Utxo | undefined {
    if (!this.pick(rng, this.lovelaceProcessorIndex)) return undefined;
    return this.pool[this.picks[this.picks.length - 1].poolIndex];
  }

  /**
   * Materializes the selection: pre-selected entries first, then every pick
   * in pick order, so results are stable and reproducible for a fixed seed.
   *
   * @returns A fresh array of the selected UTxOs.
   */
  public selectedUtxos(): Cardano.Utxo[] {
    return [
      ...this.pool.slice(0, this.preSelectedCount),
      ...this.picks.map(pick => this.pool[pick.poolIndex]),
    ];
  }

  /**
   * @returns The pool entries not selected, in pool order.
   */
  public unselectedUtxos(): Cardano.Utxo[] {
    return this.pool.filter((_, poolIndex) => !this.poolSelected[poolIndex]);
  }

  private applyToTotals(poolIndex: number, isSelected: boolean): void {
    const quantities = this.poolQuantities[poolIndex];
    for (const [processorIndex, processor] of this.processors.entries()) {
      const quantity = quantities[processorIndex];
      if (quantity > 0n) {
        processor.selectedTotal += isSelected ? quantity : -quantity;
      }
    }
  }
}

import type { Cardano } from '@cardano-sdk/core';

export interface CoinSelectorResult {
  /**
   * The set of UTxOs selected to meet or exceed the target value.
   */
  selection: Cardano.Utxo[];

  /**
   * The remaining UTxOs from the original available set that were not selected.
   */
  remaining: Cardano.Utxo[];
}

/**
 * Defines the input parameters for a coin selection algorithm.
 */
export interface CoinSelectorParams {
  /**
   * An optional set of UTxOs that must be included in the final selection.
   */
  preSelectedUtxo?: Cardano.Utxo[];

  /**
   * The pool of available UTxOs from which the algorithm can choose.
   */
  availableUtxo: Cardano.Utxo[];

  /**
   * The target value that the selected UTxOs must cover.
   */
  targetValue: Cardano.Value;
}

/**
 * Defines the contract for a coin selection strategy.
 *
 * Implementations of this interface are responsible for selecting a set of UTxOs
 * from an available pool to cover a target value.
 */
export interface CoinSelector {
  /**
   * Performs the coin selection algorithm.
   *
   * @param {CoinSelectorParams} params - The input parameters for the selection.
   * @returns {CoinSelectorResult} The result of the selection.
   */
  select(params: CoinSelectorParams): CoinSelectorResult;
}

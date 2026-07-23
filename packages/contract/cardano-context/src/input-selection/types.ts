import type { RequiredProtocolParameters } from '../types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * The subset of protocol parameters coin selection needs: `coinsPerUtxoByte`
 * drives the minimum UTxO value (min-ADA) of change outputs, and
 * `maxValueSize` bounds the serialized size of each change output value.
 */
export type CoinSelectorProtocolParameters = Pick<
  RequiredProtocolParameters,
  'coinsPerUtxoByte' | 'maxValueSize'
>;

export interface CoinSelectorResult {
  /**
   * The set of UTxOs selected to meet or exceed the target value.
   */
  selection: Cardano.Utxo[];

  /**
   * The remaining UTxOs from the original available set that were not selected.
   */
  remaining: Cardano.Utxo[];

  /**
   * Fully-formed change outputs, all sent to the change address.
   *
   * Contract invariant: `sum(selection values) === targetValue + sum(changeOutputs values)`
   * holds exactly, for coins and for every asset id. Every change output
   * satisfies the minimum UTxO value (min-ADA) rule; to fund it, the selector
   * may move extra UTxOs from `remaining` into `selection`.
   */
  changeOutputs: Cardano.TxOut[];
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
   *
   * This is the authoritative balance target. Negative asset quantities act
   * as implicit inputs (e.g. minted tokens) that flow into the change.
   * Coins can also be negative when implicit inputs such as deposit refunds
   * exceed the outputs and fee; the surplus flows into the change.
   */
  targetValue: Cardano.Value;

  /**
   * The payment outputs the selection is meant to fund. A shape and weight
   * hint for change distribution only; never authoritative for balance math,
   * which is governed exclusively by `targetValue`.
   */
  outputsToCover?: Cardano.TxOut[];

  /**
   * The address that receives all change outputs.
   */
  changeAddress: Cardano.PaymentAddress;

  /**
   * Protocol parameters needed to construct valid change outputs.
   */
  protocolParameters: CoinSelectorProtocolParameters;
}

/**
 * Defines the contract for a coin selection strategy.
 *
 * Implementations of this interface are responsible for selecting a set of UTxOs
 * from an available pool to cover a target value, and for computing the
 * min-ADA compliant change outputs that return the surplus.
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

/**
 * Classifies the reason a coin selection attempt failed.
 */
export enum InputSelectionFailure {
  /**
   * The available UTxO pool cannot cover the target value, either for ADA or
   * for some required native asset.
   */
  BalanceInsufficient = 'BalanceInsufficient',

  /**
   * The UTxO pool was exhausted while constructing valid change outputs, e.g.
   * the change could not be funded up to the minimum UTxO value (min-ADA).
   */
  UtxoFullyDepleted = 'UtxoFullyDepleted',
}

/**
 * Thrown when a coin selection algorithm cannot produce a valid selection.
 *
 * The `failure` discriminator allows callers to distinguish an insufficient
 * balance from a pool depleted while building change, without parsing the
 * human-readable message.
 */
export class InputSelectionError extends Error {
  public constructor(readonly failure: InputSelectionFailure, message: string) {
    super(message);
    this.name = 'InputSelectionError';
  }
}

import type { CoinSelector } from '../input-selection/types';
import type { RequiredProtocolParameters } from '../types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * Parameters for isTransactionBalanced.
 *
 * @property transaction - The transaction to verify.
 * @property resolvedInputs - The resolved UTxOs referenced by `transaction.body.inputs`.
 * @property protocolParameters - Protocol parameters used to compute implicit coin and fee semantics.
 */
export type IsTransactionBalancedParams = {
  transaction: Cardano.Tx;
  resolvedInputs: Cardano.Utxo[];
  protocolParameters: RequiredProtocolParameters;
};

/**
 * Parameters for balanceTransaction.
 *
 * @property unbalancedTx - The starting transaction (may contain outputs, mint, donation, metadata...).
 * @property availableUtxo - UTxOs available for selection.
 * @property preSelectedUtxo - Optional UTxOs that must be included first.
 * @property collateralUtxos - Full collateral UTxOs, used to resolve collateral signer key hashes
 *   for the VK-witness count estimate. Not selected by the coin selector.
 * @property protocolParameters - Protocol parameters.
 * @property coinSelector - Strategy used to pick inputs (e.g. Large-First).
 * @property fallbackCoinSelector - Optional strategy the balancing is retried
 *   with, from scratch, when the `coinSelector` path fails. Ignored when it is
 *   the same instance as `coinSelector`.
 * @property changeAddress - Address where change will be returned.
 */
export type BalanceTransactionParams = {
  unbalancedTx: Cardano.Tx;
  availableUtxo: Cardano.Utxo[];
  preSelectedUtxo?: Cardano.Utxo[];
  collateralUtxos?: Cardano.Utxo[];
  protocolParameters: RequiredProtocolParameters;
  coinSelector: CoinSelector;
  fallbackCoinSelector?: CoinSelector;
  changeAddress: Cardano.PaymentAddress;
};

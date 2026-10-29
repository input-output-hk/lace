import type { CoinSelector } from '../input-selection/types';
import type { RequiredProtocolParameters } from '../types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * Parameters for isTransactionBalanced.
 *
 * - `transaction`: The transaction to verify.
 * - `resolvedInputs`: The resolved UTxOs referenced by `transaction.body.inputs`.
 * - `protocolParameters`: Protocol parameters used to compute implicit coin and fee semantics.
 */
export type IsTransactionBalancedParams = {
  transaction: Cardano.Tx;
  resolvedInputs: Cardano.Utxo[];
  protocolParameters: RequiredProtocolParameters;
};

/**
 * Parameters for balanceTransaction.
 *
 * - `unbalancedTx`: The starting transaction (may contain outputs, mint, donation, metadata...).
 * - `availableUtxo`: UTxOs available for selection.
 * - `preSelectedUtxo`: Optional UTxOs that must be included first.
 * - `collateralUtxos`: Full collateral UTxOs, used to resolve collateral signer key hashes
 *   for the VK-witness count estimate. Not selected by the coin selector.
 * - `referenceUtxos`: Resolved reference inputs, so the fee prices the reference scripts
 *   they carry. Not selected by the coin selector.
 * - `protocolParameters`: Protocol parameters.
 * - `coinSelector`: Strategy used to pick inputs (e.g. Large-First).
 * - `fallbackCoinSelector`: Optional strategy the balancing is retried
 *   with, from scratch, when the `coinSelector` path fails. Ignored when it is
 *   the same instance as `coinSelector`.
 * - `changeAddress`: Address where change will be returned.
 */
export type BalanceTransactionParams = {
  unbalancedTx: Cardano.Tx;
  availableUtxo: Cardano.Utxo[];
  preSelectedUtxo?: Cardano.Utxo[];
  collateralUtxos?: Cardano.Utxo[];
  referenceUtxos?: Cardano.Utxo[];
  protocolParameters: RequiredProtocolParameters;
  coinSelector: CoinSelector;
  fallbackCoinSelector?: CoinSelector;
  changeAddress: Cardano.PaymentAddress;
};

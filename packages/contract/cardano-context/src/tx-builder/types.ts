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
 * @property unbalancedTx - The starting transaction (may contain outputs, mint, donation, metadata…).
 * @property availableUtxo - UTxOs available for selection.
 * @property preSelectedUtxo - Optional UTxOs that must be included first.
 * @property protocolParameters - Protocol parameters.
 * @property coinSelector - Strategy used to pick inputs (e.g. Large-First).
 * @property changeAddress - Address where change will be returned.
 */
export type BalanceTransactionParams = {
  unbalancedTx: Cardano.Tx;
  availableUtxo: Cardano.Utxo[];
  preSelectedUtxo?: Cardano.Utxo[];
  protocolParameters: RequiredProtocolParameters;
  coinSelector: CoinSelector;
  changeAddress: Cardano.PaymentAddress;
};

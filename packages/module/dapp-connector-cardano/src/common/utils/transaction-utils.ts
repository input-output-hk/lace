import type { TokenTransferValue } from '../hooks';
import type { Cardano } from '@cardano-sdk/core';

/**
 * The type of a transaction based on the net balance change.
 * - 'Send': User is spending more than receiving (negative net balance)
 * - 'Receive': User is receiving more than spending (positive net balance)
 * - 'Self Transaction': User is sending to themselves (zero net balance)
 */
export type TransactionType = 'Receive' | 'Self Transaction' | 'Send';

/**
 * Calculates the net ADA balance change for the user based on transaction inputs and outputs.
 *
 * The calculation follows the formula: incoming - outgoing
 * - Outgoing: Sum of coins from addresses the user owns that are being spent (from inputs)
 * - Incoming: Sum of coins going to addresses the user owns (from outputs)
 *
 * A negative result means the user is sending ADA, a positive result means receiving,
 * and zero means a self-transaction (sending to oneself).
 *
 * @param fromAddresses - Map of addresses being spent from with their coin and asset values
 * @param toAddresses - Map of addresses receiving funds with their coin and asset values
 * @param ownAddresses - Array of addresses owned by the user's wallet
 * @returns The net balance change as a bigint (negative = sending, positive = receiving, zero = self)
 */
export const calculateNetBalance = (
  fromAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>,
  toAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>,
  ownAddresses: string[],
): bigint => {
  let outgoing = BigInt(0);
  let incoming = BigInt(0);

  for (const [address, value] of fromAddresses) {
    if (ownAddresses.includes(address)) {
      outgoing += value.coins;
    }
  }

  for (const [address, value] of toAddresses) {
    if (ownAddresses.includes(address)) {
      incoming += value.coins;
    }
  }

  return incoming - outgoing;
};

/**
 * Determines the transaction type based on the net balance change.
 *
 * @param netBalance - The net balance change from calculateNetBalance
 * @returns The transaction type: 'Send' (negative), 'Receive' (positive), or 'Self Transaction' (zero)
 */
export const getTransactionType = (netBalance: bigint): TransactionType => {
  if (netBalance < BigInt(0)) {
    return 'Send';
  }
  if (netBalance > BigInt(0)) {
    return 'Receive';
  }
  return 'Self Transaction';
};

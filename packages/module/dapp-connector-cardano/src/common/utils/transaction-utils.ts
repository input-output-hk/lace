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
 * Coin values carry their sign from the inspector:
 * - fromAddresses entries have negative coins (net outflow from that address)
 * - toAddresses entries have positive coins (net inflow to that address)
 *
 * Summing the signed contributions from own addresses directly yields the net change:
 * negative = sending, positive = receiving, zero = self-transaction.
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
  let net = BigInt(0);

  for (const [address, value] of fromAddresses) {
    if (ownAddresses.includes(address)) {
      net += value.coins;
    }
  }

  for (const [address, value] of toAddresses) {
    if (ownAddresses.includes(address)) {
      net += value.coins;
    }
  }

  return net;
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

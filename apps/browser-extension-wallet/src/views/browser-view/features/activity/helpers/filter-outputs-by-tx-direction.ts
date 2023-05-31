import { Wallet } from '@lace/cardano';
import { CardanoTxOut, TxDirection } from '@src/types';

/**
 * filter outputs based on if is an incoming or outgoing tx
 */
export const filterOutputsByTxDirection = (
  outputs: CardanoTxOut[],
  direction: TxDirection,
  destinationAddress: Wallet.Cardano.PaymentAddress
): CardanoTxOut[] => {
  const destinationAddresses = new Set([destinationAddress]);
  const isIncomingTx = direction === 'Incoming';
  return outputs.filter((output) =>
    isIncomingTx ? destinationAddresses.has(output.address) : !destinationAddresses.has(output.address)
  );
};

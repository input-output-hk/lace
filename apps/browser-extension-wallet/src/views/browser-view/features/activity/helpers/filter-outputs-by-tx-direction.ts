import { Wallet } from '@lace/cardano';
import { CardanoTxOut, TxDirection } from '@src/types';

/**
 * filter outputs based on if is an incoming or outgoing tx
 */
export const filterOutputsByTxDirection = (
  outputs: CardanoTxOut[],
  direction: TxDirection,
  destinationAddresses: Wallet.Cardano.PaymentAddress[]
): CardanoTxOut[] => {
  const isIncomingTx = direction === 'Incoming';
  return outputs.filter((output) =>
    isIncomingTx ? destinationAddresses.includes(output.address) : !destinationAddresses.includes(output.address)
  );
};

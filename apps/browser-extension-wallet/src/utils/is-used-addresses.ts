import { Cardano } from '@cardano-sdk/core';

export const isUsedAddress = (
  address: Cardano.PaymentAddress,
  transactionHistory: Cardano.HydratedTx[]
): Cardano.HydratedTx => transactionHistory.find((tx) => tx.body.outputs.find((output) => output.address === address));

import { Cardano } from '@cardano-sdk/core';

export const isUsedAddress = (address: Cardano.PaymentAddress, addressesWithUtxos: Cardano.HydratedTxIn[]): boolean =>
  addressesWithUtxos.some((addr) => addr.address === address);

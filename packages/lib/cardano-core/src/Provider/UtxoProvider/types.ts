import type { Cardano, Provider } from '../..';

export interface UtxoByAddressesArgs {
  addresses: Cardano.PaymentAddress[];
}

export interface UtxoProvider extends Provider {
  /**
   * @returns an array of utxo corresponding to the given addresses
   */
  utxoByAddresses: (args: UtxoByAddressesArgs) => Promise<Cardano.Utxo[]>;
}

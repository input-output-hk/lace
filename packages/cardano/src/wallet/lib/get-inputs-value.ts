import { Cardano, ChainHistoryProvider } from '@cardano-sdk/core';
import { createWalletUtil, ObservableWallet } from '@cardano-sdk/wallet';

export type TxInput = { value?: Cardano.Value; address?: Cardano.HydratedTxIn['address'] } & Pick<
  Cardano.HydratedTxIn,
  'index' | 'txId'
>;

export const getTxInputsValueAndAddress = async (
  inputs: Cardano.HydratedTxIn[] | Cardano.TxIn[],
  chainProviderInstance: ChainHistoryProvider,
  wallet: ObservableWallet
): Promise<TxInput[]> => {
  const resolvedInputs = new Array<Cardano.Utxo>();
  const util = createWalletUtil({
    utxo: wallet.utxo,
    transactions: wallet.transactions,
    protocolParameters$: wallet.protocolParameters$,
    chainHistoryProvider: chainProviderInstance
  });

  for (const input of inputs) {
    const output = await util.resolveInput(input);
    resolvedInputs.push([{ address: output.address, ...input }, output]);
  }

  return resolvedInputs.map((utxo) => {
    const { address, value } = utxo[1];

    return {
      ...utxo[0],
      value,
      address
    };
  });
};

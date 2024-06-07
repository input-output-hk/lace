import { Cardano, ChainHistoryProvider } from '@cardano-sdk/core';
import { createWalletUtil, ObservableWallet } from '@cardano-sdk/wallet';
import flattenDeep from 'lodash/flattenDeep';

const TX_PAGINATION_LIMIT = 25;

export type TxInput = { value?: Cardano.Value; address?: Cardano.HydratedTxIn['address'] } & Pick<
  Cardano.HydratedTxIn,
  'index' | 'txId'
>;

const fetchTransactionByHashes = async (chainProviderInstance: ChainHistoryProvider, ids: Cardano.TransactionId[]) => {
  if (ids.length <= TX_PAGINATION_LIMIT) {
    return chainProviderInstance.transactionsByHashes({ ids });
  }

  const paginatedPromises = [];
  for (let i = 0; i < ids.length; i += TX_PAGINATION_LIMIT) {
    paginatedPromises.push(chainProviderInstance.transactionsByHashes({ ids: ids.slice(i, i + TX_PAGINATION_LIMIT) }));
  }
  return flattenDeep(await Promise.all(paginatedPromises));
};

export const getTxInputsValueAndAddress = async (
  inputs: Cardano.HydratedTxIn[] | Cardano.TxIn[],
  chainProviderInstance: ChainHistoryProvider,
  wallet: ObservableWallet
): Promise<TxInput[]> => {
  const inputsOutputsMapping = new Map<Cardano.TransactionId, Cardano.TxOut>();
  const txIdsToResolveInputs = new Set<Cardano.TransactionId>();

  const util = createWalletUtil({ ...wallet, chainHistoryProvider: chainProviderInstance });

  for (const input of inputs) {
    const resolvedInput = await util.resolveInput(input);
    if (resolvedInput) {
      inputsOutputsMapping.set(input.txId, resolvedInput);
    } else {
      txIdsToResolveInputs.add(input.txId);
    }
  }

  const txsWithResolvedInputs: Cardano.HydratedTx[] = await fetchTransactionByHashes(chainProviderInstance, [
    ...txIdsToResolveInputs
  ]);

  return inputs.map((input) => {
    let txOut = inputsOutputsMapping.get(input.txId);

    for (const transaction of txsWithResolvedInputs) {
      if (transaction.id === input.txId) {
        txOut = transaction.body.outputs[input.index];
      }
    }

    const { address, value } = txOut;

    return {
      ...input,
      value,
      address
    };
  });
};

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
  const util = createWalletUtil(wallet);

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

  for (const transaction of txsWithResolvedInputs) {
    const index = inputs.find((input) => input.txId === transaction.id)?.index;
    if (index !== undefined) inputsOutputsMapping.set(transaction.id, transaction.body.outputs[index]);
  }

  return Promise.all(
    inputs.map(async (input) => {
      const { address, value } = inputsOutputsMapping.get(input.txId);
      return {
        ...input,
        value,
        address
      };
    })
  );
};

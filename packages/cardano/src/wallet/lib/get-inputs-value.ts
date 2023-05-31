/* eslint-disable no-magic-numbers */
import { Cardano, ChainHistoryProvider } from '@cardano-sdk/core';
import { createWalletUtil, ObservableWallet } from '@cardano-sdk/wallet';

export type TxInput = { value?: Cardano.Value; address?: Cardano.HydratedTxIn['address'] } & Pick<
  Cardano.HydratedTxIn,
  'index' | 'txId'
>;

const fetchTransactionByHashes = (chainProviderInstance: ChainHistoryProvider, ids: Cardano.TransactionId[]) =>
  chainProviderInstance.transactionsByHashes({ ids });

export const getTxInputsValueAndAddress = async (
  inputs: Cardano.HydratedTxIn[] | Cardano.TxIn[],
  chainProviderInstance: ChainHistoryProvider,
  wallet: ObservableWallet
): Promise<TxInput[]> => {
  const inputsOutputsMapping = new Map<Cardano.TransactionId, Cardano.TxOut>();
  const util = createWalletUtil(wallet);

  for (const input of inputs) {
    inputsOutputsMapping.set(input.txId, await util.resolveInput(input));
  }

  const transactionIdsWithoutValues: Cardano.TransactionId[] = [];
  for (const [key, value] of inputsOutputsMapping) {
    if (!value) {
      transactionIdsWithoutValues.push(key);
    }
  }
  let transactions: Cardano.HydratedTx[] = [];
  if (transactionIdsWithoutValues.length > 25) {
    const chunkSize = 25; // Current pagination limit for txByHashes
    const paginatedPromises = [];
    for (let i = 0; i < transactionIdsWithoutValues.length; i += chunkSize) {
      const chunk = transactionIdsWithoutValues.slice(i, i + chunkSize);
      paginatedPromises.push(fetchTransactionByHashes(chainProviderInstance, chunk));
    }
    // eslint-disable-next-line unicorn/prefer-spread
    transactions = [].concat([], await Promise.all(paginatedPromises));
  } else {
    transactions = await fetchTransactionByHashes(chainProviderInstance, transactionIdsWithoutValues);
  }

  for (const transaction of transactions) {
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

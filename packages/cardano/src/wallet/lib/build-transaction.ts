import { createWalletUtil, ObservableWallet } from '@cardano-sdk/wallet';
import { InitializeTxProps, InitializeTxResult, MinimumCoinQuantityPerOutput } from '@cardano-sdk/tx-construction';
import { ChainHistoryProvider } from '@cardano-sdk/core';

export interface InitializedCardanoTransaction {
  transaction: InitializeTxResult;
  minimumCoinQuantities: MinimumCoinQuantityPerOutput;
}

/**
 * Validates and initializes a Cardano transaction
 * @param txProps Transaction value
 * @param wallet Wallet sending the transaction
 * @returns transaction built and minimum coin quantities
 */

// TODO: unused code
export const buildTransaction = async (
  txProps: InitializeTxProps,
  wallet: ObservableWallet,
  chainHistoryProvider: ChainHistoryProvider
): Promise<InitializedCardanoTransaction> => {
  const util = createWalletUtil({ ...wallet, chainHistoryProvider });
  const minimumCoinQuantities = await util.validateOutputs(txProps.outputs);
  const transaction = await wallet.initializeTx(txProps);

  return { transaction, minimumCoinQuantities };
};

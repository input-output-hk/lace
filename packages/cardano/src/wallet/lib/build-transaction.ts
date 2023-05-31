import {
  createWalletUtil,
  InitializeTxProps,
  InitializeTxResult,
  MinimumCoinQuantityPerOutput,
  ObservableWallet
} from '@cardano-sdk/wallet';

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
export const buildTransaction = async (
  txProps: InitializeTxProps,
  wallet: ObservableWallet
): Promise<InitializedCardanoTransaction> => {
  const util = createWalletUtil(wallet);
  const minimumCoinQuantities = await util.validateOutputs(txProps.outputs);
  const transaction = await wallet.initializeTx(txProps);

  return { transaction, minimumCoinQuantities };
};

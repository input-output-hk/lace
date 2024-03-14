import { useEffect, useCallback } from 'react';
import { Wallet } from '@lace/cardano';
import { BuiltTxData, OutputsMap } from '../views/browser-view/features/send-transaction/types';
import { useSpentBalances } from '../views/browser-view/features/send-transaction/store';
import { useObservable } from '@lace/common';
import { getReachedMaxAmountList } from '@src/views/browser-view/features/send-transaction/helpers';
import { useWalletStore } from '@src/stores';
import { useMaxAda } from './useMaxAda';
import { UseTranslationResponse } from 'react-i18next';
import { TranslationKey } from '@lib/translations/types';

const { buildTransactionProps, setMissingCoins, getTotalMinimumCoins } = Wallet;

export enum COIN_SELECTION_ERRORS {
  BALANCE_INSUFFICIENT_ERROR = 'UTxO Balance Insufficient',
  NOT_FRAGMENTED_ENOUGH_ERROR = 'UTxO Not Fragmented Enough',
  FULLY_DEPLETED_ERROR = 'UTxO Fully Depleted',
  MAXIMUM_INPUT_COUNT_EXCEEDED_ERROR = 'Maximum Input Count Exceeded',
  BUNDLE_AMOUNT_IS_EMPTY = 'Bundle amount is empty'
}

export const coinSelectionErrors = new Map<COIN_SELECTION_ERRORS, TranslationKey>([
  [COIN_SELECTION_ERRORS.BALANCE_INSUFFICIENT_ERROR, 'general.errors.insufficientBalance'],
  [COIN_SELECTION_ERRORS.NOT_FRAGMENTED_ENOUGH_ERROR, 'general.errors.utxoNotFragmentedEnough'],
  [COIN_SELECTION_ERRORS.FULLY_DEPLETED_ERROR, 'general.errors.utxoFullyDepleted'],
  [COIN_SELECTION_ERRORS.MAXIMUM_INPUT_COUNT_EXCEEDED_ERROR, 'general.errors.maximumInputCountExceeded'],
  [COIN_SELECTION_ERRORS.BUNDLE_AMOUNT_IS_EMPTY, 'general.errors.bundleAmountIsEmpty']
]);

export const getErrorMessage =
  (t: UseTranslationResponse<'translation'>['t']) =>
  (key: COIN_SELECTION_ERRORS): string => {
    if (coinSelectionErrors.has(key)) {
      return t(coinSelectionErrors.get(key));
    }

    return t('general.errors.somethingWentWrong');
  };

export const useInitializeTx = (
  inMemoryWallet: Wallet.ObservableWallet,
  setBuiltTxData: (tx: Partial<BuiltTxData>) => void,
  txProps: { outputs: OutputsMap; metadata?: string; hasInvalidOutputs?: boolean }
): void => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { outputs, metadata, hasInvalidOutputs } = txProps;
  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const tokensUsed = useSpentBalances();
  const spendableCoin = useMaxAda();

  const buildTransaction = useCallback(async () => {
    const reachedMaxAmountList = getReachedMaxAmountList({
      assets: assetsInfo,
      tokensUsed,
      spendableCoin,
      balance,
      exceed: true,
      cardanoCoin
    });
    if (hasInvalidOutputs || reachedMaxAmountList.length > 0) {
      setBuiltTxData({
        uiTx: undefined,
        tx: undefined,
        totalMinimumCoins: undefined,
        error: undefined,
        reachedMaxAmountList
      });
    } else {
      try {
        const partialTxProps = buildTransactionProps({ metadata, outputsMap: outputs, assetsInfo });
        const util = Wallet.createWalletUtil(inMemoryWallet);
        const minimumCoinQuantities = await util.validateOutputs(partialTxProps.outputs);
        const totalMinimumCoins = getTotalMinimumCoins(minimumCoinQuantities);
        const outputsWithMissingCoins = setMissingCoins(minimumCoinQuantities, partialTxProps.outputs);
        const txBuilder = inMemoryWallet.createTxBuilder();

        outputsWithMissingCoins.outputs.forEach((output) => txBuilder.addOutput(output));
        txBuilder.metadata(partialTxProps?.auxiliaryData?.blob || new Map());
        const tx = txBuilder.build();
        const inspection = await tx.inspect();
        setBuiltTxData({
          uiTx: {
            fee: inspection.inputSelection.fee,
            hash: inspection.hash,
            outputs: inspection.inputSelection.outputs,
            handleResolutions: inspection.handleResolutions
          },
          tx,
          totalMinimumCoins,
          error: undefined,
          reachedMaxAmountList: []
        });
      } catch (error) {
        console.error('error initializing transaction:', { error });
        setBuiltTxData({
          uiTx: undefined,
          tx: undefined,
          error: error.message,
          reachedMaxAmountList: []
        });
      }
    }
  }, [
    assetsInfo,
    tokensUsed,
    spendableCoin,
    balance,
    cardanoCoin,
    hasInvalidOutputs,
    setBuiltTxData,
    metadata,
    outputs,
    inMemoryWallet
  ]);

  useEffect(() => {
    buildTransaction();
  }, [buildTransaction]);
};

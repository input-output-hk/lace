import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber } from '@lace-sdk/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DUST_THRESHOLD, encodeUnsignedTxToString } from '../common';
import { TransactionBuilder } from '../tx-builder';

import type { BitcoinBlockchainSpecificTxData } from '@lace-contract/bitcoin-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  TokenTransfer,
  TxBuildResult,
  TxExecutorImplementation,
  TxParams,
} from '@lace-contract/tx-executor';

/**
 * Case-insensitive Bitcoin detection.
 * @param tokenId The token ID to check.
 */
export const isBitcoin = (tokenId: string): boolean =>
  tokenId === BITCOIN_TOKEN_ID;

/**
 * Convert a single TokenTransfer to a bigint value for Bitcoin transactions.
 * @param normalizedAmount The normalized amount of the token transfer.
 * @param token The token information of the token transfer.
 */
export const tokenTransferToValue = ({
  normalizedAmount,
  token,
}: TokenTransfer): bigint => {
  const amount = BigNumber.valueOf(normalizedAmount);
  if (isBitcoin(token.tokenId)) {
    return amount;
  }
  throw new Error(
    'Only BTC token transfers are supported in Bitcoin transactions',
  );
};

/**
 * Convert TxParams to amount for Bitcoin transactions.
 * @param txp The transaction parameters.
 */
export const txParamsToAmount = (txp: TxParams): number => {
  if (txp.tokenTransfers.length !== 1) {
    throw new Error(
      'Only single token transfers are supported in Bitcoin transactions',
    );
  }

  return Number(tokenTransferToValue(txp.tokenTransfers[0]));
};

/**
 * Build a Bitcoin transaction.
 * @param bitcoinAccountWallets$ Observable of Bitcoin account wallets.
 * @param logger Logger instance for logging.
 */
export const makeBuildTx =
  ({
    bitcoinAccountWallets$,
    logger,
  }: SideEffectDependencies): TxExecutorImplementation['buildTx'] =>
  ({ txParams }) => {
    return defer(async (): Promise<TxBuildResult> => {
      const firstTokenTransfer = txParams[0]?.tokenTransfers[0];

      if (!firstTokenTransfer) {
        return genericErrorResults.buildTx({
          error: new Error('No token transfers found in txParams'),
        });
      }

      const accountId = firstTokenTransfer.token.accountId.valueOf();

      const bitcoinAccountWallet = (
        await firstValueFrom(bitcoinAccountWallets$)
      )[accountId];

      if (!bitcoinAccountWallet) {
        logger.error(`Bitcoin buildTx: Invalid account ID ${accountId}`);
        return {
          errorTranslationKey: 'tx-executor.invalid-account-id',
          success: false,
        };
      }

      const network = bitcoinAccountWallet.network;
      const utxos = await firstValueFrom(bitcoinAccountWallet.utxos$);
      const addresses = await firstValueFrom(bitcoinAccountWallet.addresses$);

      if (!txParams[0].blockchainSpecific) {
        logger.error(`Bitcoin buildTx: Missing blockchain specific data`);
        return genericErrorResults.buildTx({
          error: new Error('Missing blockchain specific data'),
        });
      }

      const { feeRate, memo } = txParams[0]
        .blockchainSpecific as BitcoinBlockchainSpecificTxData;

      const currentFeeRate = (
        await firstValueFrom(bitcoinAccountWallet.getCurrentFeeMarket())
      ).unwrap();

      let rateToUse = 0.0;

      if (feeRate.feeOption === 'Custom') {
        rateToUse = feeRate.customFeeRate ?? 0.0;
      } else if (feeRate.feeOption === 'Fast') {
        rateToUse = currentFeeRate.fast.feeRate;
      } else if (feeRate.feeOption === 'Average') {
        rateToUse = currentFeeRate.standard.feeRate;
      } else if (feeRate.feeOption === 'Low') {
        rateToUse = currentFeeRate.slow.feeRate;
      }

      logger.debug(`Bitcoin buildTx: Using fee rate of ${rateToUse} sat/vB`);
      const txBuilder = new TransactionBuilder(network, rateToUse, addresses);

      txBuilder
        .setChangeAddress(bitcoinAccountWallet.address.address)
        .setUtxoSet(utxos);

      for (const txp of txParams) {
        const amount = txParamsToAmount(txp);
        txBuilder.addOutput(txp.address, amount);

        logger.debug(
          `Bitcoin buildTx: Adding output to address: ${txp.address} with amount from txParams: ${amount}`,
        );
      }

      if (memo) {
        logger.debug(`Bitcoin buildTx: Adding OP_RETURN memo: ${memo}`);
        txBuilder.addOpReturnOutput(memo);
      }

      const tx = txBuilder.build();
      tx.network = network;

      return {
        fees: [
          { amount: BigNumber(BigInt(tx.fee)), tokenId: BITCOIN_TOKEN_ID },
        ],
        serializedTx: encodeUnsignedTxToString(tx),
        success: true,
      };
    }).pipe(
      catchError((error: Error) => of(genericErrorResults.buildTx({ error }))),
    );
  };

// TODO LW-14768
export const makePreviewTx =
  (_: SideEffectDependencies): TxExecutorImplementation['previewTx'] =>
  () =>
    of({
      minimumAmount: BigNumber(BigInt(DUST_THRESHOLD)),
      success: true,
    });

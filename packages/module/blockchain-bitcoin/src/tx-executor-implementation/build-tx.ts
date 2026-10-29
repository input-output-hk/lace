import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber } from '@lace-lib/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DUST_THRESHOLD } from '../common';
import { buildBitcoinPayment, buildErrorTranslationKey } from '../tx-builder';

import type { PendingActivitiesByAccount } from '@lace-contract/activities';
import type { BitcoinBlockchainSpecificTxData } from '@lace-contract/bitcoin-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  TokenTransfer,
  TxBuildResult,
  TxExecutorImplementation,
  TxParams,
} from '@lace-contract/tx-executor';
import type { Observable } from 'rxjs';

/**
 * Case-insensitive Bitcoin detection.
 * @param tokenId - The token ID to check.
 */
export const isBitcoin = (tokenId: string): boolean =>
  tokenId === BITCOIN_TOKEN_ID;

/**
 * Convert a single TokenTransfer to a bigint value for Bitcoin transactions.
 * @param normalizedAmount - The normalized amount of the token transfer.
 * @param token - The token information of the token transfer.
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
 * @param txp - The transaction parameters.
 */
export const txParamsToAmount = (txp: TxParams): number => {
  if (txp.tokenTransfers.length !== 1) {
    throw new Error(
      'Only single token transfers are supported in Bitcoin transactions',
    );
  }

  return Number(tokenTransferToValue(txp.tokenTransfers[0]));
};

export const makeBuildTx =
  (
    { bitcoinAccountWallets$, logger }: SideEffectDependencies,
    pendingActivitiesByAccount$: Observable<PendingActivitiesByAccount>,
  ): TxExecutorImplementation['buildTx'] =>
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

      const pendingActivitiesByAccount = await firstValueFrom(
        pendingActivitiesByAccount$,
      );

      if (!txParams[0].blockchainSpecific) {
        logger.error(`Bitcoin buildTx: Missing blockchain specific data`);
        return genericErrorResults.buildTx({
          error: new Error('Missing blockchain specific data'),
        });
      }

      const { feeRate, memo } = txParams[0]
        .blockchainSpecific as BitcoinBlockchainSpecificTxData;

      const { serializedTx, fee } = await buildBitcoinPayment({
        wallet: bitcoinAccountWallet,
        pendingActivities:
          pendingActivitiesByAccount[firstTokenTransfer.token.accountId] ?? [],
        outputs: txParams.map(txp => ({
          address: txp.address,
          amount: txParamsToAmount(txp),
        })),
        feeRate,
        memo,
        logger,
      });

      return {
        fees: [{ amount: BigNumber(fee), tokenId: BITCOIN_TOKEN_ID }],
        serializedTx,
        success: true,
      };
    }).pipe(
      catchError((error: Error) =>
        // `genericErrorResults.buildTx` drops the error and always returns the
        // generic key, so map the (blockchain-specific) build error to a
        // precise translation key here. The generic, blockchain-agnostic send
        // flow renders whatever key we put on the result — keeping the mapping
        // in this module preserves that separation of concerns.
        of({
          success: false as const,
          errorTranslationKey: buildErrorTranslationKey(error),
        }),
      ),
    );
  };

export const makePreviewTx =
  (_: SideEffectDependencies): TxExecutorImplementation['previewTx'] =>
  () =>
    of({ minimumAmount: BigNumber(BigInt(DUST_THRESHOLD)), success: true });

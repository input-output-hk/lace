import { ActivityType } from '@lace-contract/activities';
import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber } from '@lace-sdk/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DUST_THRESHOLD, encodeUnsignedTxToString } from '../common';
import { buildErrorTranslationKey, TransactionBuilder } from '../tx-builder';

import type {
  Activity,
  BlockchainSpecificActivityMetadata,
  PendingActivitiesByAccount,
} from '@lace-contract/activities';
import type {
  BitcoinBlockchainSpecificTxData,
  BitcoinInFlightUtxoActivityMetadata,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
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

const getBitcoinInFlight = (
  activity: Activity,
): BitcoinInFlightUtxoActivityMetadata | undefined => {
  if (activity.type !== ActivityType.Pending) return undefined;
  const blockchainSpecific = activity.blockchainSpecific as
    | BlockchainSpecificActivityMetadata
    | undefined;
  return blockchainSpecific?.Bitcoin;
};

const outpointKey = (ref: { txId: string; index: number }) =>
  `${ref.txId}#${ref.index}`;

// Bitcoin: only drop outpoints consumed by pending txs. Unconfirmed produced
// outputs are not added to the spendable set — spending unconfirmed Bitcoin
// outputs is unsafe under RBF and bounded by mempool ancestor limits.
export const applyInFlightUtxoAdjustments = (
  utxos: readonly BitcoinUTxO[],
  _accountAddresses: ReadonlySet<string>,
  pendingActivities: readonly Activity[],
): BitcoinUTxO[] => {
  const spent = new Set<string>();
  for (const activity of pendingActivities) {
    const inFlight = getBitcoinInFlight(activity);
    if (!inFlight) continue;
    for (const input of inFlight.consumedInputs) {
      spent.add(outpointKey(input));
    }
  }

  if (spent.size === 0) return [...utxos];

  return utxos.filter(utxo => !spent.has(outpointKey(utxo)));
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

      const network = bitcoinAccountWallet.network;
      const utxos = await firstValueFrom(bitcoinAccountWallet.utxos$);
      const addresses = await firstValueFrom(bitcoinAccountWallet.addresses$);
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

      const ownAddresses = new Set(addresses.map(a => a.address));
      const adjustedUtxos = applyInFlightUtxoAdjustments(
        utxos,
        ownAddresses,
        pendingActivitiesByAccount[firstTokenTransfer.token.accountId] ?? [],
      );

      txBuilder
        .setChangeAddress(bitcoinAccountWallet.address.address)
        .setUtxoSet(adjustedUtxos);

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

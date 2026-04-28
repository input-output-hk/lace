import {
  createTxInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, Err, Ok, type Result, Timestamp } from '@lace-sdk/util';
import { catchError, from, map, of } from 'rxjs';

import { assetProvider } from './get-fallback-asset';

import type {
  CardanoPaymentAddress,
  CardanoRewardAccount,
  ExtendedTxDetails,
  RequiredProtocolParameters,
} from '../../types';
import type { Milliseconds } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

const TX_SUMMARY_INSPECTOR_TIMEOUT = 10_000 as Milliseconds;

export type MapTransactionToActivityParams = {
  accountId: AccountId;
  txDetails: ExtendedTxDetails;
  accountAddresses: CardanoPaymentAddress[];
  rewardAccount: CardanoRewardAccount;
  protocolParameters: RequiredProtocolParameters;
  resolveInput: Cardano.ResolveInput;
  logger: Logger;
};

/**
 * Retrieves and processes transaction activity details for a given account.
 *
 * @param {Object} params - Parameters required to fetch and process account activity.
 * @param {Cardano.HydratedTx & { blockTime: number }} params.txDetails - Details of the transactions to analyze.
 * @param {CardanoPaymentAddress[]} params.accountAddresses - A set of account addresses to track activity for.
 * @param {CardanoRewardAccount} params.rewardAccount - The reward account to monitor for activity.
 * @param {RequiredProtocolParameters} params.protocolParameters - Current protocol parameters required for transaction validation and processing.
 * @param {Cardano.ResolveInput} params.resolveInput - A resolver function used to fetch detailed information about transaction inputs.
 * @param {Logger} params.logger - A logger instance for logging purposes during processing.
 * @returns {Observable<Result<Activity, Error>>} An observable for the account activity operation result.
 * Results will be encapsulated in the `Result` type, which is a success (`Ok`) or error (`Err`).
 *
 * The function inspects transaction details, resolves inputs, and identifies token balance changes and activity type (e.g., send/receive).
 * It processes the activity and categorizes assets, including ADA (identified with the token ID 'lovelace'), while using a fallback
 * asset provider for assets that need minimal attribute resolution.
 *
 * Errors encountered during the observable stream processing are captured as `Err` in the result.
 */
export const mapTransactionToActivity = ({
  accountId,
  txDetails,
  accountAddresses,
  rewardAccount,
  protocolParameters,
  resolveInput,
  logger,
}: MapTransactionToActivityParams): Observable<Result<Activity, Error>> => {
  const txSummaryInspector = createTxInspector({
    summary: transactionSummaryInspector({
      addresses: accountAddresses.map(address =>
        Cardano.PaymentAddress(address),
      ),
      rewardAccounts: [Cardano.RewardAccount(rewardAccount)],
      inputResolver: {
        resolveInput,
      },
      protocolParameters,
      // Using a dummy asset provider as we don't need to fetch assets for the summary
      // We don't want the transactionSummaryInspector to build a fallback asset on its own getAssets() failure,
      // because it logs an error, and we don't want that as having a fallback asset is intentional.
      assetProvider,
      timeout: TX_SUMMARY_INSPECTOR_TIMEOUT,
      logger,
    }),
  });

  return from(txSummaryInspector(txDetails)).pipe(
    map(({ summary }) => {
      return Ok({
        accountId,
        activityId: txDetails.id,
        timestamp: Timestamp(txDetails.blockTime * 1000),
        tokenBalanceChanges: [
          ...Array.from(summary.assets.entries()).map(
            ([assetId, assetInfo]) => ({
              tokenId: TokenId(assetId),
              amount: BigNumber(assetInfo.amount),
            }),
          ),
          // TODO: handle different networks and ADA token id correctly
          // https://input-output.atlassian.net/browse/LW-13023
          {
            tokenId: TokenId('lovelace'),
            amount: BigNumber(summary.coins),
          },
        ],
        type: summary.coins > 0 ? ActivityType.Receive : ActivityType.Send,
      });
    }),
    catchError((error: Error) => of(Err(error))),
  );
};

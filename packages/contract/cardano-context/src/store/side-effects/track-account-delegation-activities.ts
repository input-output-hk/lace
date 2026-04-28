import {
  ProviderError,
  ProviderFailure,
  createTxInspector,
  transactionSummaryInspector,
  Cardano,
  type Milliseconds,
} from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Err, Ok, Timestamp, type Result } from '@lace-sdk/util';
import {
  filter,
  merge,
  mergeMap,
  from,
  takeUntil,
  withLatestFrom,
  map,
  of,
  catchError,
  forkJoin,
} from 'rxjs';
import { resultMergeMap } from 'ts-results-es/rxjs-operators';

import {
  CardanoRewardAccount,
  type DelegationInfo,
  type ExtendedTxDetails,
  type RegistrationInfo,
  type RequiredProtocolParameters,
  type CardanoAddressData,
  type WithdrawalInfo,
} from '../../types';
import { getActivityTypeFromDelegationEntry } from '../helpers/get-activity-type-from-delegation-entry';
import { assetProvider } from '../helpers/get-fallback-asset';
import { getAccountAddresses } from '../helpers/group-cardano-addresses-by-account';
import { createInputResolver } from '../helpers/transaction-processors';

import type { SideEffect, Action } from '../../contract';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

const TX_SUMMARY_INSPECTOR_TIMEOUT = 10_000 as Milliseconds;

type CreateDelegationActivityParams = {
  accountId: AccountId;
  txDetails: ExtendedTxDetails;
  assetId: string;
  amount: BigNumber;
  type: ActivityType;
};

/**
 * Creates an Activity object with common properties for delegation-related activities.
 */
const createDelegationActivity = ({
  accountId,
  txDetails,
  assetId,
  amount,
  type,
}: CreateDelegationActivityParams): Activity => ({
  accountId,
  activityId: txDetails.id,
  timestamp: Timestamp(txDetails.blockTime * 1000),
  tokenBalanceChanges: [
    {
      tokenId: TokenId(assetId),
      amount,
    },
  ],
  type,
});

type MapTransactionToActivityParams = {
  accountId: AccountId;
  txDetails: ExtendedTxDetails;
  assetId: string;
  amount: bigint | number | string;
  type: ActivityType;
  protocolParameters?: RequiredProtocolParameters;
  accountAddresses?: AnyAddress<CardanoAddressData>[];
  rewardAccount?: CardanoRewardAccount;
  resolveInput?: Parameters<SideEffect>[2]['cardanoProvider']['resolveInput'];
  chainId?: Cardano.ChainId;
  logger: Logger;
};

const mapTransactionToActivity = ({
  accountId,
  txDetails,
  assetId,
  amount,
  type,
  protocolParameters,
  accountAddresses,
  rewardAccount,
  resolveInput,
  chainId,
  logger,
}: MapTransactionToActivityParams): Observable<Result<Activity, Error>> => {
  const fee = txDetails.body.fee;

  // For Registration and Deregistration: need transaction inspector to get deposit/returnedDeposit
  if (
    (type === ActivityType.Registration ||
      type === ActivityType.Deregistration) &&
    protocolParameters &&
    accountAddresses &&
    accountAddresses.length > 0 &&
    rewardAccount &&
    resolveInput &&
    chainId &&
    logger
  ) {
    const txSummaryInspector = createTxInspector({
      summary: transactionSummaryInspector({
        addresses: accountAddresses.map(address =>
          Cardano.PaymentAddress(address.address),
        ),
        rewardAccounts: accountAddresses.map(address =>
          Cardano.RewardAccount(address.data?.rewardAccount as string),
        ),
        inputResolver: createInputResolver(
          resolveInput as unknown as Parameters<typeof createInputResolver>[0],
          chainId,
        ),
        protocolParameters,
        assetProvider,
        timeout: TX_SUMMARY_INSPECTOR_TIMEOUT,
        logger,
      }),
    });

    return from(txSummaryInspector(txDetails)).pipe(
      map(({ summary }) => {
        let calculatedAmount: bigint;

        if (type === ActivityType.Registration) {
          const deposit = summary.deposit;
          calculatedAmount = BigInt(0) - deposit;
        } else {
          // Deregistration
          const returnedDeposit = summary.returnedDeposit;
          // Formula: depositReclaim - fee
          calculatedAmount = returnedDeposit - fee;
        }

        const activity = createDelegationActivity({
          accountId,
          txDetails,
          assetId,
          amount: BigNumber(calculatedAmount),
          type,
        });
        return Ok(activity);
      }),
      catchError((error: Error) => of(Err(error))),
    );
  }

  // For Delegation: show negative fee
  if (type === ActivityType.Delegation) {
    // Formula: -fee
    const calculatedAmount = BigInt(0) - fee;
    const activity = createDelegationActivity({
      accountId,
      txDetails,
      assetId,
      amount: BigNumber(calculatedAmount),
      type,
    });
    return of(Ok(activity));
  }

  // For other activity types, use the provided amount
  try {
    const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
    const amountBigNumber = BigNumber(amountBigInt);
    const activity = createDelegationActivity({
      accountId,
      txDetails,
      assetId,
      amount: amountBigNumber,
      type,
    });
    return of(Ok(activity));
  } catch (error: unknown) {
    return of(Err(error instanceof Error ? error : new Error(String(error))));
  }
};

type MissingDelegationTransactionData = {
  txId: Cardano.TransactionId;
  accountId: AccountId;
  rewardAccount: CardanoRewardAccount;
  amount: bigint | number | string;
  type: ActivityType;
};

type ProcessDelegationTransactionDeps = {
  actions: Parameters<SideEffect>[2]['actions'];
  getTransactionDetails: Parameters<SideEffect>[2]['cardanoProvider']['getTransactionDetails'];
  mapTransactionToActivity: (
    params: MapTransactionToActivityParams,
  ) => Observable<Result<Activity, Error>>;
  chainId: Cardano.ChainId;
  protocolParameters?: RequiredProtocolParameters;
  resolveInput: Parameters<SideEffect>[2]['cardanoProvider']['resolveInput'];
  logger: Logger;
  allAddresses: AnyAddress[];
};

const processDelegationTransaction = (
  data: MissingDelegationTransactionData,
  deps: ProcessDelegationTransactionDeps,
): Observable<Action> => {
  const { txId, accountId, amount, type, rewardAccount } = data;
  const {
    getTransactionDetails,
    chainId,
    mapTransactionToActivity,
    actions,
    protocolParameters,
    resolveInput,
    logger,
    allAddresses,
  } = deps;

  return getTransactionDetails(txId, {
    chainId,
  }).pipe(
    resultMergeMap(txDetails => {
      // Get account addresses for this specific account
      const accountAddresses = getAccountAddresses(
        allAddresses,
        accountId,
        chainId,
      );

      return mapTransactionToActivity({
        accountId,
        txDetails,
        assetId: 'lovelace',
        amount,
        type,
        protocolParameters,
        accountAddresses,
        rewardAccount,
        resolveInput,
        chainId,
        logger,
      });
    }),
    map(accountActivityResult =>
      accountActivityResult.mapOrElse<Action>(
        error =>
          actions.cardanoContext.setDelegationActivitiesFailed({
            accountId: AccountId(accountId),
            rewardAccount,
            failure:
              error instanceof ProviderError
                ? error.reason
                : ProviderFailure.Unknown,
          }),
        activity =>
          actions.cardanoContext.setDelegationActivities({
            accountId: AccountId(accountId),
            rewardAccount,
            activities: [activity],
          }),
      ),
    ),
  );
};

/**
 * Unified side effect that tracks account delegations, registrations, and withdrawals history
 * by listening to loadAccountDelegationHistory actions and fetching all three types
 * in parallel. Dispatches history actions as each request completes, then fetches
 * transaction details for each entry to create delegation activities.
 */
export const trackAccountDelegationActivities: SideEffect = (
  {
    cardanoContext: {
      loadAccountDelegationHistory$,
      clearAccountDelegationHistory$,
    },
  },
  {
    cardanoContext: { selectChainId$, selectProtocolParameters$ },
    addresses: { selectAllAddresses$ },
  },
  {
    actions,
    cardanoProvider: {
      getAccountDelegations,
      getAccountRegistrations,
      getAccountWithdrawals,
      getTransactionDetails,
      resolveInput,
    },
    logger,
  },
) =>
  loadAccountDelegationHistory$.pipe(
    withLatestFrom(
      selectChainId$.pipe(filter(Boolean)),
      selectProtocolParameters$,
      selectAllAddresses$,
    ),
    mergeMap(
      ([
        {
          payload: { accountId, rewardAccount },
        },
        chainId,
        protocolParameters,
        allAddresses,
      ]) => {
        // Create a filtered observable that emits when clearAccountDelegationHistory
        // is called for the same accountId and rewardAccount
        const cancel$ = clearAccountDelegationHistory$.pipe(
          filter(
            ({ payload: clearPayload }) =>
              clearPayload.accountId === accountId &&
              clearPayload.rewardAccount === rewardAccount,
          ),
        );

        const props = { rewardAccount };
        const context = { chainId };

        // Call each method separately and wait for all to complete (all-or-nothing)
        const delegations$ = getAccountDelegations(props, context).pipe(
          takeUntil(cancel$),
        );
        const registrations$ = getAccountRegistrations(props, context).pipe(
          takeUntil(cancel$),
        );
        const withdrawals$ = getAccountWithdrawals(props, context).pipe(
          takeUntil(cancel$),
        );

        return forkJoin({
          delegations: delegations$,
          registrations: registrations$,
          withdrawals: withdrawals$,
        }).pipe(
          mergeMap(results => {
            // Check if any request failed
            if (results.delegations.isErr()) {
              // If any failed, dispatch failure action (all-or-nothing approach)
              const error = results.delegations.unwrapErr();
              const failure =
                error instanceof ProviderError
                  ? error.reason
                  : ProviderFailure.Unknown;

              return from([
                actions.cardanoContext.setAccountDelegationsHistoryFailed({
                  accountId,
                  rewardAccount,
                  failure,
                }),
              ]);
            }

            if (results.registrations.isErr()) {
              const error = results.registrations.unwrapErr();
              const failure =
                error instanceof ProviderError
                  ? error.reason
                  : ProviderFailure.Unknown;

              return from([
                actions.cardanoContext.setAccountDelegationsHistoryFailed({
                  accountId,
                  rewardAccount,
                  failure,
                }),
              ]);
            }

            if (results.withdrawals.isErr()) {
              const error = results.withdrawals.unwrapErr();
              const failure =
                error instanceof ProviderError
                  ? error.reason
                  : ProviderFailure.Unknown;

              return from([
                actions.cardanoContext.setAccountDelegationsHistoryFailed({
                  accountId,
                  rewardAccount,
                  failure,
                }),
              ]);
            }

            // Combine all successful results
            const allItems = [
              ...results.delegations.unwrap(),
              ...results.registrations.unwrap(),
              ...results.withdrawals.unwrap(),
            ];

            const setHistoryAction =
              actions.cardanoContext.setAccountDelegationsHistory({
                accountId,
                rewardAccount,
                items: allItems,
              });

            // If protocol parameters are not available, skip transaction fetching
            if (protocolParameters === undefined) {
              return from([setHistoryAction]);
            }

            // Get account addresses early to check if they're available
            const accountAddresses = getAccountAddresses(
              allAddresses,
              accountId,
              chainId,
            );

            // If addresses are not available (empty due to race conditions or not yet loaded),
            // skip transaction fetching to avoid Registration/Deregistration activities
            // falling through to fallback code path with 0n amount
            if (accountAddresses.length === 0) {
              return from([setHistoryAction]);
            }

            const processDelegationTransactionDeps: ProcessDelegationTransactionDeps =
              {
                actions,
                getTransactionDetails,
                mapTransactionToActivity,
                chainId,
                protocolParameters,
                resolveInput,
                logger,
                allAddresses,
              };

            // Process each entry to fetch its transaction
            const transactionFetches$ = from(allItems).pipe(
              mergeMap(
                (entry: DelegationInfo | RegistrationInfo | WithdrawalInfo) => {
                  const activityType =
                    getActivityTypeFromDelegationEntry(entry);

                  return processDelegationTransaction(
                    {
                      txId: entry.txHash,
                      accountId: AccountId(accountId),
                      rewardAccount: CardanoRewardAccount(rewardAccount),
                      amount: 'amount' in entry ? entry.amount : 0n,
                      type: activityType,
                    },
                    processDelegationTransactionDeps,
                  );
                },
              ),
              takeUntil(cancel$),
            );

            return merge(from([setHistoryAction]), transactionFetches$);
          }),
          catchError(error => {
            // Handle forkJoin errors (e.g., if any observable errors)
            return from([
              actions.cardanoContext.setAccountDelegationsHistoryFailed({
                accountId,
                rewardAccount,
                failure:
                  error instanceof ProviderError
                    ? error.reason
                    : ProviderFailure.Unknown,
              }),
            ]);
          }),
        );
      },
    ),
  );

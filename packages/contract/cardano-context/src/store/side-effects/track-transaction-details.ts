import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { EMPTY, filter, map, of, switchMap, withLatestFrom } from 'rxjs';
import { resultMergeMap } from 'ts-results-es/rxjs-operators';

import { mapTransactionToActivityDetails } from '../helpers/map-transaction-to-activity-details';
import {
  createGetTokenMetadataWrapper as implicitCreateGetTokenMetadataWrapper,
  createInputResolver as implicitCreateInputResolver,
} from '../helpers/transaction-processors';
import { extractAccountInfo } from '../helpers/transformers';

import type { Action, SideEffect } from '../../contract';
import type { CardanoProvider, RequiredProtocolParameters } from '../../types';
import type { GetTokenMetadataWrapper } from '../helpers/transaction-processors';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';

type CreateTrackTransactionDetailsParams = {
  createInputResolver?: (
    resolveInput: CardanoProvider['resolveInput'],
    chainId: Cardano.ChainId,
  ) => Cardano.InputResolver;
  createGetTokenMetadataWrapper?: (
    getTokenMetadata: CardanoProvider['getTokenMetadata'],
    chainId: Cardano.ChainId,
  ) => GetTokenMetadataWrapper;
};

// Extract the mapping function for better readability
const destructureActivityWithContext = ([
  {
    payload: { activity },
  },
  chainId,
  addresses,
  protocolParameters,
]: [
  { payload: { activity: Activity } },
  Cardano.ChainId,
  AnyAddress[],
  RequiredProtocolParameters | undefined,
]) => ({
  activity,
  chainId,
  addresses,
  protocolParameters,
});

export const createTrackTransactionDetails =
  ({
    createInputResolver = implicitCreateInputResolver,
    createGetTokenMetadataWrapper = implicitCreateGetTokenMetadataWrapper,
  }: CreateTrackTransactionDetailsParams = {}): SideEffect =>
  (
    { activities },
    { addresses, cardanoContext },
    {
      actions: {
        activities: { setActivityDetails },
      },
      cardanoProvider: {
        getTransactionDetails,
        resolveInput,
        getTokenMetadata,
      },
      logger,
    },
  ) =>
    activities.loadActivityDetails$.pipe(
      filter(({ payload: { blockchainName } }) => blockchainName === 'Cardano'),
      withLatestFrom(
        cardanoContext.selectChainId$.pipe(filter(Boolean)),
        addresses.selectAllAddresses$,
        cardanoContext.selectProtocolParameters$,
      ),
      map(destructureActivityWithContext),
      switchMap(({ activity, chainId, addresses, protocolParameters }) => {
        const { type, accountId, activityId } = activity;

        if (protocolParameters === undefined) {
          return EMPTY;
        }

        // Extract account information
        const accountInfo = extractAccountInfo({
          activity: { accountId },
          chainId,
          addresses,
        });

        if (!accountInfo) {
          return EMPTY;
        }

        const { rewardAccount, accountPaymentAddresses } = accountInfo;

        // Handle reward activities
        if (type === ActivityType.Rewards) {
          return of(
            setActivityDetails({
              activityDetails: {
                ...activity,
                fee: '0',
                address: rewardAccount,
              },
            }),
          );
        }

        // Process transaction details
        // TODO: LW-13522 look into solutions to avoid re-fetching transaction details
        return getTransactionDetails(Cardano.TransactionId(activityId), {
          chainId,
        }).pipe(
          resultMergeMap(txDetails => {
            return mapTransactionToActivityDetails({
              activity,
              txDetails,
              accountAddresses: accountPaymentAddresses,
              protocolParameters,
              rewardAccount,
              inputResolver: createInputResolver(resolveInput, chainId),
              getTokenMetadata: createGetTokenMetadataWrapper(
                getTokenMetadata,
                chainId,
              ),
              logger,
            });
          }),
          map(result =>
            result.mapOrElse<Action>(
              _error => setActivityDetails({ activityDetails: undefined }),
              activityDetails => setActivityDetails({ activityDetails }),
            ),
          ),
        );
      }),
    );

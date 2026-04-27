import { Cardano } from '@cardano-sdk/core';
import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { testSideEffect } from '@lace-lib/util-dev';
import { Timestamp, Ok, Err } from '@lace-sdk/util';
import { EMPTY, of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { mapTransactionToActivityDetails } from '../../../src/store/helpers/map-transaction-to-activity-details';
import { extractAccountInfo } from '../../../src/store/helpers/transformers';
import { createTrackTransactionDetails } from '../../../src/store/side-effects/track-transaction-details';
import {
  CardanoRewardAccount,
  type CardanoProvider,
  type CardanoTransaction,
} from '../../../src/types';
import {
  account0Context,
  cardanoAccount0Addr,
  cardanoAccount1Addr,
  chainId,
} from '../../mocks';

import type { AccountInfo } from '../../../src/store/helpers/transformers';
import type { RequiredProtocolParameters } from '../../../src/types';
import type { Activity, ActivityDetail } from '@lace-contract/activities';

vi.mock('../../../src/store/helpers/transformers', () => ({
  extractAccountInfo: vi.fn(),
}));

vi.mock(
  '../../../src/store/helpers/map-transaction-to-activity-details',
  () => ({
    mapTransactionToActivityDetails: vi.fn(),
  }),
);

const actions = {
  ...activitiesActions,
};

describe('createTrackTransactionDetails', () => {
  const trackTransactionDetails = createTrackTransactionDetails();

  const baseActivity: Activity = {
    activityId:
      '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
    type: ActivityType.Send,
    accountId: account0Context.accountId,
    timestamp: Timestamp(Date.now()),
    tokenBalanceChanges: [],
  };

  const mockAccountInfo: AccountInfo = {
    rewardAccount: CardanoRewardAccount(
      'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
    ),
    accountPaymentAddresses: [
      Cardano.PaymentAddress(cardanoAccount1Addr.address),
    ],
  };

  const mockTxDetails = {
    id: Cardano.TransactionId(baseActivity.activityId),
  };

  const mockActivityDetails: ActivityDetail = {
    ...baseActivity,
    fee: '194541',
    address:
      'addr_test1qzuk9c0qaq8ustvatan8xelmp3wjn9n99c78004dsfjwvs4h5kpytryyph0d9vyzj9g9e5rwsnxc2djcandyywdvu8kq54t0f8',
  };

  const protocolParameters = {
    coinsPerUtxoByte: 4310,
  } as RequiredProtocolParameters;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      name: 'completes without emitting when protocolParameters is undefined',
      activity: baseActivity,
      protocolParameters: undefined,
      mockExtractAccountInfo: mockAccountInfo,
    },
    {
      name: 'completes without emitting when extractAccountInfo returns null',
      activity: baseActivity,
      protocolParameters,
      mockExtractAccountInfo: null,
    },
    {
      name: 'getTransactionDetails is called when all data is valid',
      activity: baseActivity,
      protocolParameters,
      mockExtractAccountInfo: mockAccountInfo,
      shouldMockGetTransactionDetails: true,
    },
  ])(
    '$name',
    ({
      activity,
      protocolParameters,
      shouldMockGetTransactionDetails,
      mockExtractAccountInfo,
    }) => {
      // Mock to return null for the third test case
      vi.mocked(extractAccountInfo).mockReturnValue(mockExtractAccountInfo);
      const mockGetTransactionDetails = vi.fn().mockReturnValue(EMPTY);

      testSideEffect(
        trackTransactionDetails,
        ({ cold, expectObservable, flush }) => {
          return {
            actionObservables: {
              activities: {
                loadActivityDetails$: cold('a', {
                  a: {
                    payload: { activity, blockchainName: 'Cardano' as const },
                    type: 'activities/loadActivityDetails',
                  },
                }),
              },
            },
            stateObservables: {
              activities: {},
              addresses: {
                selectAllAddresses$: cold('a', { a: [cardanoAccount0Addr] }),
              },
              cardanoContext: {
                selectChainId$: cold('a', { a: chainId }),
                selectProtocolParameters$: cold('a', { a: protocolParameters }),
              },
            },
            dependencies: {
              cardanoProvider: {
                ...(shouldMockGetTransactionDetails
                  ? {
                      getTransactionDetails: mockGetTransactionDetails,
                    }
                  : {}),
                resolveInput: vi.fn(),
                getTokenMetadata: vi.fn(),
              } as unknown as CardanoProvider,
              actions,
            },
            assertion: sideEffect$ => {
              if (shouldMockGetTransactionDetails) {
                // For the case when all data is valid, verify getTransactionDetails was called
                expectObservable(sideEffect$).toBe('');
                flush();
                expect(mockGetTransactionDetails).toHaveBeenCalled();
              } else {
                // Should complete without emitting anything when conditions are not met
                expectObservable(sideEffect$).toBe('');
              }
            },
          };
        },
      );
    },
  );

  it.each([
    {
      name: 'dispatches setActivityDetails with activity details when getTransactionDetails succeeds',
      mockGetTransactionDetails: vi.fn().mockReturnValue(of(Ok(mockTxDetails))),
      expectedAction: actions.activities.setActivityDetails({
        activityDetails: mockActivityDetails,
      }),
      shouldCallMapTransactionToActivityDetails: true,
    },
    {
      name: 'dispatches setActivityDetails with undefined when getTransactionDetails fails',
      mockGetTransactionDetails: vi
        .fn()
        .mockReturnValue(of(Err(new Error('Transaction not found')))),
      expectedAction: actions.activities.setActivityDetails({
        activityDetails: undefined,
      }),
      shouldCallMapTransactionToActivityDetails: false,
    },
  ])(
    '$name',
    ({
      mockGetTransactionDetails,
      expectedAction,
      shouldCallMapTransactionToActivityDetails,
    }) => {
      // Mock extractAccountInfo to return valid account info
      vi.mocked(extractAccountInfo).mockReturnValue(mockAccountInfo);

      // Mock mapTransactionToActivityDetails to return success (same for both cases)
      vi.mocked(mapTransactionToActivityDetails).mockReturnValue(
        of(Ok(mockActivityDetails as ActivityDetail<CardanoTransaction>)),
      );

      testSideEffect(
        trackTransactionDetails,
        ({ cold, expectObservable, flush }) => ({
          actionObservables: {
            activities: {
              loadActivityDetails$: cold('a', {
                a: {
                  payload: {
                    activity: baseActivity,
                    blockchainName: 'Cardano' as const,
                  },
                  type: 'activities/loadActivityDetails',
                },
              }),
            },
          },
          stateObservables: {
            activities: {},
            addresses: {
              selectAllAddresses$: cold('a', { a: [cardanoAccount0Addr] }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectProtocolParameters$: cold('a', {
                a: protocolParameters,
              }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getTransactionDetails: mockGetTransactionDetails,
              resolveInput: vi.fn(),
              getTokenMetadata: vi.fn(),
            } as unknown as CardanoProvider,
            actions,
          },
          assertion: sideEffect$ => {
            // Should emit the expected action
            expectObservable(sideEffect$).toBe('a', {
              a: expectedAction,
            });
            flush();

            // Verify getTransactionDetails was called
            expect(mockGetTransactionDetails).toHaveBeenCalledWith(
              Cardano.TransactionId(baseActivity.activityId),
              { chainId },
            );

            // Verify mapTransactionToActivityDetails was called or not based on scenario
            if (shouldCallMapTransactionToActivityDetails) {
              expect(mapTransactionToActivityDetails).toHaveBeenCalled();
            } else {
              expect(mapTransactionToActivityDetails).not.toHaveBeenCalled();
            }
          },
        }),
      );
    },
  );

  it.todo('should handle rewards activity');
});

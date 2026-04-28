import '../../src/augmentations';

import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  makeDeregistrationAwaitingConfirmation,
  makeDeregistrationFeeCalculation,
  makeDeregistrationProcessing,
} from '../../src/store/deregistration-side-effects';
import { stakingCenterActions } from '../../src/store/slice';

import {
  createMockWallet,
  createTestAccountId,
  createTestFees,
  TEST_DEPOSIT_RETURN,
  TEST_SERIALIZED_TX,
  TEST_TX_ID,
} from './test-utils';

import type { DeregistrationFlowState } from '../../src/store/deregistration-types';
import type { BuildDeregistrationTxResult } from '@lace-contract/cardano-context';
import type {
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const logger = dummyLogger;
const testAccountId = createTestAccountId();
const testWallet = createMockWallet(testAccountId);
const testFees = createTestFees();
const testDepositReturn = TEST_DEPOSIT_RETURN;
const testSerializedTx = TEST_SERIALIZED_TX;
const testTxId = TEST_TX_ID;

describe('deregistration side effects', () => {
  describe('makeDeregistrationFeeCalculation', () => {
    it('dispatches "feeCalculationCompleted" on successful build', () => {
      const buildDeregistrationTxResult: BuildDeregistrationTxResult = {
        success: true,
        serializedTx: testSerializedTx,
        fees: testFees,
        depositReturn: testDepositReturn,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeDeregistrationFeeCalculation({
              buildDeregistrationTx: () =>
                cold('a', { a: buildDeregistrationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                } as DeregistrationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [testWallet],
              }),
            },
          },
          dependencies: {
            actions: stakingCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.deregistrationFlow.feeCalculationCompleted(
                {
                  depositReturn: testDepositReturn,
                  fees: testFees,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                },
              ),
            });
          },
        }),
      );
    });

    it('dispatches "feeCalculationFailed" on build failure', () => {
      const buildDeregistrationTxResult: BuildDeregistrationTxResult = {
        success: false,
        error: new Error('Build failed'),
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeDeregistrationFeeCalculation({
              buildDeregistrationTx: () =>
                cold('a', { a: buildDeregistrationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                } as DeregistrationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [testWallet],
              }),
            },
          },
          dependencies: {
            actions: stakingCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.deregistrationFlow.feeCalculationFailed({
                errorMessage: 'Build failed',
                errorTranslationKeys: {
                  title: 'v2.staking.deregistration.error.title',
                  subtitle: 'v2.staking.deregistration.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });

    it('dispatches "feeCalculationFailed" when no wallet found', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeDeregistrationFeeCalculation({
              buildDeregistrationTx: () =>
                cold('a', {
                  a: { success: true } as BuildDeregistrationTxResult,
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                } as DeregistrationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [] as AnyWallet[] }),
            },
          },
          dependencies: {
            actions: stakingCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.deregistrationFlow.feeCalculationFailed({
                errorMessage: 'No wallet or account found for deregistration',
                errorTranslationKeys: {
                  title: 'v2.staking.deregistration.error.title',
                  subtitle: 'v2.staking.deregistration.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });
  });

  describe('makeDeregistrationAwaitingConfirmation', () => {
    it('calls confirmTx with correct parameters', () => {
      const confirmTx = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            confirmTx.mockReturnValue(cold('-'));
            return makeDeregistrationAwaitingConfirmation({ confirmTx });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  confirmButtonEnabled: false,
                  depositReturn: testDepositReturn,
                  fees: testFees,
                } as DeregistrationFlowState,
              }),
            },
          },
          dependencies: {
            actions: stakingCenterActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            expect(confirmTx).toHaveBeenCalledWith(
              expect.objectContaining({
                accountId: testAccountId,
                serializedTx: testSerializedTx,
                wallet: testWallet,
                blockchainName: 'Cardano',
              }),
              expect.any(Function),
            );
          },
        }),
      );
    });

    it('dispatches "confirmationCompleted" with result', () => {
      const confirmResult: TxConfirmationResult = {
        success: true,
        serializedTx: testSerializedTx,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeDeregistrationAwaitingConfirmation({
              confirmTx: (_, mapResult) =>
                cold('a', { a: mapResult(confirmResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  confirmButtonEnabled: false,
                  depositReturn: testDepositReturn,
                  fees: testFees,
                } as DeregistrationFlowState,
              }),
            },
          },
          dependencies: {
            actions: stakingCenterActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.deregistrationFlow.confirmationCompleted({
                result: confirmResult,
              }),
            });
          },
        }),
      );
    });
  });

  describe('makeDeregistrationProcessing', () => {
    it('dispatches "processingResulted" with result on success', () => {
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
      };
      const mockTimestamp = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeDeregistrationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  depositReturn: testDepositReturn,
                  fees: testFees,
                } as DeregistrationFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...stakingCenterActions, ...activitiesActions },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: activitiesActions.activities.upsertActivities({
                accountId: testAccountId,
                activities: [
                  {
                    accountId: testAccountId,
                    activityId: testTxId,
                    timestamp: Timestamp(mockTimestamp),
                    tokenBalanceChanges: [
                      {
                        tokenId: LOVELACE_TOKEN_ID,
                        amount: BigNumber(-200000n),
                      },
                      {
                        tokenId: LOVELACE_TOKEN_ID,
                        amount: BigNumber(2000000n), // Deposit return is POSITIVE
                      },
                    ],
                    type: ActivityType.Pending,
                  },
                ],
              }),
              b: stakingCenterActions.deregistrationFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });

    it('dispatches "processingResulted" on failure without pending activity', () => {
      const submitResult: TxSubmissionResult = {
        success: false,
        errorTranslationKeys: {
          title: 'v2.staking.deregistration.error.title',
          subtitle: 'v2.staking.deregistration.error.subtitle',
        },
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeDeregistrationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  depositReturn: testDepositReturn,
                  fees: testFees,
                } as DeregistrationFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...stakingCenterActions, ...activitiesActions },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.deregistrationFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );
    });

    it('does not include deposit return when depositReturn is "0"', () => {
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
      };
      const mockTimestamp = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeDeregistrationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            deregistrationFlow: {
              selectDeregistrationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  depositReturn: '0',
                  fees: testFees,
                } as DeregistrationFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...stakingCenterActions, ...activitiesActions },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: activitiesActions.activities.upsertActivities({
                accountId: testAccountId,
                activities: [
                  {
                    accountId: testAccountId,
                    activityId: testTxId,
                    timestamp: Timestamp(mockTimestamp),
                    tokenBalanceChanges: [
                      {
                        tokenId: LOVELACE_TOKEN_ID,
                        amount: BigNumber(-200000n),
                      },
                      // No deposit return entry when it's 0
                    ],
                    type: ActivityType.Pending,
                  },
                ],
              }),
              b: stakingCenterActions.deregistrationFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });
  });
});

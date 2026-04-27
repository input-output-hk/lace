import '../../src/augmentations';

import { Cardano } from '@cardano-sdk/core';
import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  makeDelegationAwaitingConfirmation,
  makeDelegationProcessing,
  makeFeeCalculation,
} from '../../src/store/side-effects';
import { stakingCenterActions } from '../../src/store/slice';

import type { DelegationFlowState } from '../../src/store/types';
import type { BuildDelegationTxResult } from '@lace-contract/cardano-context';
import type {
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const logger = dummyLogger;

const testAccountId = AccountId('test-account');
const testPoolId = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);
const testWallet = {
  accounts: [{ accountId: testAccountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;
const testFees = [{ amount: BigNumber(200000n), tokenId: LOVELACE_TOKEN_ID }];
const testDeposit = '2000000';
const testSerializedTx = 'a100818258...';
const testTxId = 'txId123';

describe('staking-center side effects', () => {
  describe('makeFeeCalculation', () => {
    it('dispatches "feeCalculationCompleted" on successful build', () => {
      const buildDelegationTxResult: BuildDelegationTxResult = {
        success: true,
        serializedTx: testSerializedTx,
        fees: testFees,
        deposit: testDeposit,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildDelegationTx: () =>
                cold('a', { a: buildDelegationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  poolId: testPoolId,
                } as DelegationFlowState,
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
              a: stakingCenterActions.delegationFlow.feeCalculationCompleted({
                deposit: testDeposit,
                fees: testFees,
                serializedTx: testSerializedTx,
                wallet: testWallet,
              }),
            });
          },
        }),
      );
    });

    it('dispatches "feeCalculationFailed" on build failure', () => {
      const buildDelegationTxResult: BuildDelegationTxResult = {
        success: false,
        error: new Error('Build failed'),
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildDelegationTx: () =>
                cold('a', { a: buildDelegationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  poolId: testPoolId,
                } as DelegationFlowState,
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
              a: stakingCenterActions.delegationFlow.feeCalculationFailed({
                errorMessage: 'Build failed',
                errorTranslationKeys: {
                  title: 'v2.staking.delegation.error.title',
                  subtitle: 'v2.staking.delegation.error.subtitle',
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
            makeFeeCalculation({
              buildDelegationTx: () =>
                cold('a', { a: { success: true } as BuildDelegationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  poolId: testPoolId,
                } as DelegationFlowState,
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
              a: stakingCenterActions.delegationFlow.feeCalculationFailed({
                errorMessage: 'No wallet or account found for delegation',
                errorTranslationKeys: {
                  title: 'v2.staking.delegation.error.title',
                  subtitle: 'v2.staking.delegation.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });

    it('dispatches "feeCalculationFailed" for non-Cardano account', () => {
      const midnightWallet = {
        accounts: [{ accountId: testAccountId, blockchainName: 'Midnight' }],
      } as unknown as AnyWallet;

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildDelegationTx: () =>
                cold('a', { a: { success: true } as BuildDelegationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  poolId: testPoolId,
                } as DelegationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [midnightWallet],
              }),
            },
          },
          dependencies: {
            actions: stakingCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.delegationFlow.feeCalculationFailed({
                errorMessage:
                  'Delegation is only supported for Cardano accounts',
                errorTranslationKeys: {
                  title: 'v2.staking.delegation.error.title',
                  subtitle: 'v2.staking.delegation.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });
  });

  describe('makeDelegationAwaitingConfirmation', () => {
    it('calls confirmTx with correct parameters', () => {
      const confirmTx = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            confirmTx.mockReturnValue(cold('-'));
            return makeDelegationAwaitingConfirmation({ confirmTx });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  confirmButtonEnabled: false,
                  deposit: testDeposit,
                  fees: testFees,
                } as DelegationFlowState,
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
            makeDelegationAwaitingConfirmation({
              confirmTx: (_, mapResult) =>
                cold('a', { a: mapResult(confirmResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  confirmButtonEnabled: false,
                  deposit: testDeposit,
                  fees: testFees,
                } as DelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: stakingCenterActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.delegationFlow.confirmationCompleted({
                result: confirmResult,
              }),
            });
          },
        }),
      );
    });
  });

  describe('makeDelegationProcessing', () => {
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
            makeDelegationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as DelegationFlowState,
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
                        amount: BigNumber(-2000000n),
                      },
                    ],
                    type: ActivityType.Pending,
                  },
                ],
              }),
              b: stakingCenterActions.delegationFlow.processingResulted({
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
          title: 'v2.staking.delegation.error.title',
          subtitle: 'v2.staking.delegation.error.subtitle',
        },
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeDelegationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            delegationFlow: {
              selectDelegationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as DelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...stakingCenterActions, ...activitiesActions },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: stakingCenterActions.delegationFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );
    });
  });
});

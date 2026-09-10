import '../../src/augmentations';

import { Cardano, ProviderFailure } from '@cardano-sdk/core';
import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { serializeError } from '@lace-lib/util-store';
import { defer, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  makeEarnRewardsAwaitingConfirmation,
  makeEarnRewardsProcessing,
  makeFeeCalculation,
} from '../../src/store/side-effects';
import { earnRewardsActions } from '../../src/store/slice';

import type { EarnRewardsFlowState } from '../../src/store/types';
import type {
  BuildEarnRewardsTxResult,
  DRepOption,
} from '@lace-contract/cardano-context';
import type {
  SubmitTx,
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const logger = dummyLogger;

const testAccountId = AccountId('test-account');
const testPoolId = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);
const testDRep: DRepOption = {
  type: 'specific',
  drepId: Cardano.DRepID(
    'drep1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqua9udh',
  ),
};
const testWallet = {
  accounts: [{ accountId: testAccountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;
const testFees = [{ amount: BigNumber(200000n), tokenId: LOVELACE_TOKEN_ID }];
const testDeposit = '2000000';
const testSerializedTx = 'a100818258...';
const testTxId = 'txId123';

const calculatingFeesState = {
  status: 'CalculatingFees',
  accountId: testAccountId,
  poolId: testPoolId,
  dRep: testDRep,
} as EarnRewardsFlowState;

describe('earn-rewards side effects', () => {
  describe('makeFeeCalculation', () => {
    it('dispatches feeCalculationCompleted on a successful build', () => {
      const result: BuildEarnRewardsTxResult = {
        success: true,
        serializedTx: testSerializedTx,
        fees: testFees,
        deposit: testDeposit,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildEarnRewardsTx: () => cold('a', { a: result }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: calculatingFeesState,
              }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.feeCalculationCompleted({
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

    it('dispatches feeCalculationFailed at once on a non-retriable build failure', () => {
      const result: BuildEarnRewardsTxResult = {
        success: false,
        // Non-retriable reason: skips the transparent-retry tier entirely.
        error: Object.assign(new Error('Build failed'), {
          reason: ProviderFailure.BadRequest,
        }),
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildEarnRewardsTx: () => cold('a', { a: result }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: calculatingFeesState,
              }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.feeCalculationFailed({
                errorMessage: 'Build failed',
                errorTranslationKeys: {
                  title: 'v2.earn-rewards.error.title',
                  subtitle: 'v2.earn-rewards.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });

    it('dispatches feeCalculationFailed when no wallet/account is found', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildEarnRewardsTx: () =>
                cold('a', {
                  a: { success: true, serializedTx: '', fees: [], deposit: '' },
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: calculatingFeesState,
              }),
            },
            wallets: { selectAll$: cold('a', { a: [] }) },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.feeCalculationFailed({
                errorMessage: 'No wallet or account found for earn-rewards',
                errorTranslationKeys: {
                  title: 'v2.earn-rewards.error.title',
                  subtitle: 'v2.earn-rewards.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });

    it('dispatches feeCalculationFailed for a non-Cardano account', () => {
      const bitcoinWallet = {
        accounts: [{ accountId: testAccountId, blockchainName: 'Bitcoin' }],
      } as unknown as AnyWallet;

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildEarnRewardsTx: () =>
                cold('a', {
                  a: { success: true, serializedTx: '', fees: [], deposit: '' },
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: calculatingFeesState,
              }),
            },
            wallets: { selectAll$: cold('a', { a: [bitcoinWallet] }) },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.feeCalculationFailed({
                errorMessage:
                  'Earn rewards is only supported for Cardano accounts',
                errorTranslationKeys: {
                  title: 'v2.earn-rewards.error.title',
                  subtitle: 'v2.earn-rewards.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });

    it('dispatches feeCalculationFailed when the build observable errors', () => {
      // Non-retriable so the thrown error surfaces without the retry delays.
      const error = Object.assign(new Error('build threw'), {
        reason: ProviderFailure.BadRequest,
      });
      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildEarnRewardsTx: () => cold('#', undefined, error),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: calculatingFeesState,
              }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.feeCalculationFailed({
                errorMessage: String(error),
                errorTranslationKeys: {
                  title: 'v2.earn-rewards.error.title',
                  subtitle: 'v2.earn-rewards.error.subtitle',
                },
              }),
            });
          },
        }),
      );
    });

    it('transparently retries a retriable build failure and succeeds (ADR 15)', () => {
      // No `reason` field → classified retriable by isRetriableError.
      const retriable: BuildEarnRewardsTxResult = {
        success: false,
        error: new Error('socket hang up'),
      };
      const success: BuildEarnRewardsTxResult = {
        success: true,
        serializedTx: testSerializedTx,
        fees: testFees,
        deposit: testDeposit,
      };
      let buildAttempts = 0;

      testSideEffect(
        {
          build: () =>
            makeFeeCalculation({
              // Cold like the real builder: each retry re-subscription re-runs
              // the build, so the second attempt can return a different result.
              buildEarnRewardsTx: () =>
                defer(() => of(++buildAttempts === 1 ? retriable : success)),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: calculatingFeesState,
              }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            // First backoff interval is 300ms; the user never sees the blip.
            expectObservable(sideEffect$).toBe('300ms a', {
              a: earnRewardsActions.earnRewardsFlow.feeCalculationCompleted({
                deposit: testDeposit,
                fees: testFees,
                serializedTx: testSerializedTx,
                wallet: testWallet,
              }),
            });
          },
        }),
      );

      expect(buildAttempts).toBe(2);
    });

    it('surfaces the failure only after transparent retries are exhausted', () => {
      const error = new Error('socket hang up');
      let buildAttempts = 0;

      testSideEffect(
        {
          build: () =>
            makeFeeCalculation({
              buildEarnRewardsTx: () =>
                defer(() => {
                  buildAttempts += 1;
                  return of({ success: false as const, error });
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: calculatingFeesState,
              }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            // 300 + 600 + 1200ms of backoff before the error reaches the user.
            expectObservable(sideEffect$).toBe('2100ms a', {
              a: earnRewardsActions.earnRewardsFlow.feeCalculationFailed({
                errorMessage: String(error),
                errorTranslationKeys: {
                  title: 'v2.earn-rewards.error.title',
                  subtitle: 'v2.earn-rewards.error.subtitle',
                },
              }),
            });
          },
        }),
      );

      // 1 initial attempt + 3 retries.
      expect(buildAttempts).toBe(4);
    });
  });

  describe('makeEarnRewardsAwaitingConfirmation', () => {
    it('dispatches confirmationCompleted with the confirm result', () => {
      const confirmResult: TxConfirmationResult = {
        success: true,
        serializedTx: testSerializedTx,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsAwaitingConfirmation({
              confirmTx: (_, mapResult) =>
                cold('a', { a: mapResult(confirmResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  deposit: testDeposit,
                  fees: testFees,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.confirmationCompleted({
                result: confirmResult,
              }),
            });
          },
        }),
      );
    });

    it('dispatches a failure confirmationCompleted when confirmTx errors', () => {
      const error = new Error('confirm threw');
      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsAwaitingConfirmation({
              confirmTx: () => cold('#', undefined, error),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  deposit: testDeposit,
                  fees: testFees,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.confirmationCompleted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: {
                    title: 'v2.earn-rewards.error.title',
                    subtitle: 'v2.earn-rewards.error.subtitle',
                  },
                },
              }),
            });
          },
        }),
      );
    });
  });

  describe('makeEarnRewardsProcessing', () => {
    it('emits a pending activity then processingResulted on success', () => {
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
      };
      const mockTimestamp = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...earnRewardsActions, ...activitiesActions },
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
              b: earnRewardsActions.earnRewardsFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });

    it('carries the submit result’s blockchain metadata onto the pending activity', () => {
      // Without this the in-flight view cannot subtract what the delegation
      // spends, so its inputs stay offered as spendable until it confirms.
      const activityMetadata = {
        Cardano: { consumedInputs: [{ txId: testTxId, index: 0 }] },
      };
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
        blockchainSpecificActivityMetadata: activityMetadata,
      };
      const mockTimestamp = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...earnRewardsActions, ...activitiesActions },
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
                    blockchainSpecific: activityMetadata,
                  },
                ],
              }),
              b: earnRewardsActions.earnRewardsFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });

    it('dispatches only processingResulted on a non-retriable submission failure', () => {
      const submitResult: TxSubmissionResult = {
        success: false,
        // Serialized-error shape as folded by the executor; the non-retriable
        // reason skips the transparent-retry tier.
        error: {
          name: 'Error',
          message: 'submit failed',
          reason: ProviderFailure.BadRequest,
        },
        errorTranslationKeys: {
          title: 'v2.earn-rewards.error.title',
          subtitle: 'v2.earn-rewards.error.subtitle',
        },
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );
    });

    it('omits the deposit change in the pending activity when already registered', () => {
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
      };
      const mockTimestamp = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  // Already registered → empty deposit → no deposit change.
                  deposit: '',
                  fees: testFees,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...earnRewardsActions, ...activitiesActions },
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
                    ],
                    type: ActivityType.Pending,
                  },
                ],
              }),
              b: earnRewardsActions.earnRewardsFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });

    it('dispatches a failure processingResulted when submitTx errors', () => {
      // Non-retriable so the thrown error surfaces without the retry delays.
      const error = Object.assign(new Error('submit threw'), {
        reason: ProviderFailure.BadRequest,
      });
      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsProcessing({
              submitTx: () => cold('#', undefined, error),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: earnRewardsActions.earnRewardsFlow.processingResulted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: {
                    title: 'v2.earn-rewards.error.title',
                    subtitle: 'v2.earn-rewards.error.subtitle',
                  },
                },
              }),
            });
          },
        }),
      );
    });

    it('passes a non-result value from submitTx through unchanged', () => {
      // The tx-executor can emit passthrough actions (no `success` field)
      // alongside the final result; those must be re-emitted, not swallowed.
      const passthrough = { type: 'txExecutor/passthrough' };
      testSideEffect(
        {
          build: ({ cold }) =>
            makeEarnRewardsProcessing({
              // Fake emits a passthrough action (no `success`) instead of a
              // result; cast because SubmitTx's element type is the executor's
              // own action/result union.
              submitTx: (() =>
                cold('a', { a: passthrough })) as unknown as SubmitTx,
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: { actions: earnRewardsActions, logger },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', { a: passthrough });
          },
        }),
      );
    });

    it('re-submits with a fresh execution on a retriable failure and succeeds (ADR 15)', () => {
      // No `reason` field → classified retriable by isRetriableError.
      const retriable: TxSubmissionResult = {
        success: false,
        error: { name: 'Error', message: 'connection reset' },
        errorTranslationKeys: {
          title: 'v2.earn-rewards.error.title',
          subtitle: 'v2.earn-rewards.error.subtitle',
        },
      };
      const success: TxSubmissionResult = { success: true, txId: testTxId };
      const mockTimestamp = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
      // Cast: SubmitTx is generic over the result mapper, which vi.fn cannot
      // model; the implementation below matches the real call shape.
      const submitTx =
        vi.fn<
          (
            params: unknown,
            mapResult: (result: TxSubmissionResult) => unknown,
          ) => unknown
        >();

      testSideEffect(
        {
          build: ({ cold }) => {
            // Each attempt is a fresh submitTx call (fresh executionId) — the
            // second call, not a re-subscription of the first, must succeed.
            submitTx.mockImplementation((_, mapResult) =>
              cold('a', {
                a: mapResult(
                  submitTx.mock.calls.length === 1 ? retriable : success,
                ),
              }),
            );
            return makeEarnRewardsProcessing({
              submitTx: submitTx as unknown as SubmitTx,
            });
          },
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            earnRewardsFlow: {
              selectEarnRewardsFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  poolId: testPoolId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  // Already registered → no deposit change in the activity.
                  deposit: '',
                  fees: testFees,
                } as EarnRewardsFlowState,
              }),
            },
          },
          dependencies: {
            actions: { ...earnRewardsActions, ...activitiesActions },
          },
          assertion: sideEffect$ => {
            // First backoff interval is 300ms; the user never sees the blip.
            expectObservable(sideEffect$).toBe('300ms (ab)', {
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
                    ],
                    type: ActivityType.Pending,
                  },
                ],
              }),
              b: earnRewardsActions.earnRewardsFlow.processingResulted({
                result: success,
              }),
            });
          },
        }),
      );

      expect(submitTx).toHaveBeenCalledTimes(2);
      vi.restoreAllMocks();
    });
  });
});

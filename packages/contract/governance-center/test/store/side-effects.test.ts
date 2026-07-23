import '../../src/augmentations';

import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { analyticsActions } from '@lace-contract/analytics';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Err, Ok, type Result } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { throwError } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_GOVERNANCE_CENTER } from '../../src/const';
import {
  fetchDRepsSideEffect,
  makeFeeCalculation,
  makeVoteDelegationAwaitingConfirmation,
  makeVoteDelegationProcessing,
  resetDRepsOnNetworkChange,
  resolvePromotedDRepsSideEffect,
  syncGovernanceFeatureFlagPayload,
  trackGovernanceDelegationConfirmed,
} from '../../src/store/side-effects';
import { governanceCenterActions } from '../../src/store/slice';

import type { VoteDelegationFlowState } from '../../src/store/types';
import type { Cardano } from '@cardano-sdk/core';
import type {
  BuildVoteDelegationTxResult,
  CardanoProvider,
  DRepOption,
  DRepSummary,
} from '@lace-contract/cardano-context';
import type {
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const logger = dummyLogger;

const testAccountId = AccountId('test-account');
const testDRep: DRepOption = { type: 'alwaysAbstain' };
const testWallet = {
  accounts: [{ accountId: testAccountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;
const testFees = [{ amount: BigNumber(200000n), tokenId: LOVELACE_TOKEN_ID }];
const testDeposit = '2000000';
const testSerializedTx = 'a100818258...';
const testTxId = 'txId123';

describe('governance-center side effects', () => {
  describe('makeFeeCalculation', () => {
    it('dispatches "feeCalculationCompleted" on successful build', () => {
      const buildVoteDelegationTxResult: BuildVoteDelegationTxResult = {
        success: true,
        serializedTx: testSerializedTx,
        fees: testFees,
        deposit: testDeposit,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildVoteDelegationTx: () =>
                cold('a', { a: buildVoteDelegationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  dRep: testDRep,
                } as VoteDelegationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [testWallet],
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.feeCalculationCompleted(
                {
                  deposit: testDeposit,
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
      const buildVoteDelegationTxResult: BuildVoteDelegationTxResult = {
        success: false,
        error: new Error('Build failed'),
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeFeeCalculation({
              buildVoteDelegationTx: () =>
                cold('a', { a: buildVoteDelegationTxResult }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  dRep: testDRep,
                } as VoteDelegationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [testWallet],
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.feeCalculationFailed(
                {
                  errorMessage: 'Build failed',
                  errorTranslationKeys: {
                    title: 'v2.governance.delegation.error.title',
                    subtitle: 'v2.governance.delegation.error.subtitle',
                  },
                },
              ),
            });
          },
        }),
      );
    });

    it('dispatches "feeCalculationFailed" when the build observable throws', () => {
      testSideEffect(
        {
          build: () =>
            makeFeeCalculation({
              buildVoteDelegationTx: () => throwError(() => new Error('boom')),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  dRep: testDRep,
                } as VoteDelegationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [testWallet] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.feeCalculationFailed(
                {
                  errorMessage: 'Error: boom',
                  errorTranslationKeys: {
                    title: 'v2.governance.delegation.error.title',
                    subtitle: 'v2.governance.delegation.error.subtitle',
                  },
                },
              ),
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
              buildVoteDelegationTx: () =>
                cold('a', {
                  a: { success: true } as BuildVoteDelegationTxResult,
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  dRep: testDRep,
                } as VoteDelegationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [] as AnyWallet[] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.feeCalculationFailed(
                {
                  errorMessage:
                    'No wallet or account found for vote delegation',
                  errorTranslationKeys: {
                    title: 'v2.governance.delegation.error.title',
                    subtitle: 'v2.governance.delegation.error.subtitle',
                  },
                },
              ),
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
              buildVoteDelegationTx: () =>
                cold('a', {
                  a: { success: true } as BuildVoteDelegationTxResult,
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'CalculatingFees',
                  accountId: testAccountId,
                  dRep: testDRep,
                } as VoteDelegationFlowState,
              }),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [midnightWallet],
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.feeCalculationFailed(
                {
                  errorMessage:
                    'Vote delegation is only supported for Cardano accounts',
                  errorTranslationKeys: {
                    title: 'v2.governance.delegation.error.title',
                    subtitle: 'v2.governance.delegation.error.subtitle',
                  },
                },
              ),
            });
          },
        }),
      );
    });
  });

  describe('makeVoteDelegationAwaitingConfirmation', () => {
    it('calls confirmTx with correct parameters', () => {
      const confirmTx = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            confirmTx.mockReturnValue(cold('-'));
            return makeVoteDelegationAwaitingConfirmation({ confirmTx });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  confirmButtonEnabled: false,
                  deposit: testDeposit,
                  fees: testFees,
                } as VoteDelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
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
            makeVoteDelegationAwaitingConfirmation({
              confirmTx: (_, mapResult) =>
                cold('a', { a: mapResult(confirmResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  confirmButtonEnabled: false,
                  deposit: testDeposit,
                  fees: testFees,
                } as VoteDelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.confirmationCompleted(
                {
                  result: confirmResult,
                },
              ),
            });
          },
        }),
      );
    });

    it('dispatches "confirmationCompleted" failure when confirmTx throws', () => {
      testSideEffect(
        {
          build: () =>
            makeVoteDelegationAwaitingConfirmation({
              confirmTx: () => throwError(() => new Error('boom')),
            }),
        },
        ({ cold, flush }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'AwaitingConfirmation',
                  accountId: testAccountId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  confirmButtonEnabled: false,
                  deposit: testDeposit,
                  fees: testFees,
                } as VoteDelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            const emitted: ReturnType<
              typeof governanceCenterActions.voteDelegationFlow.confirmationCompleted
            >[] = [];
            sideEffect$.subscribe(action =>
              emitted.push(
                action as ReturnType<
                  typeof governanceCenterActions.voteDelegationFlow.confirmationCompleted
                >,
              ),
            );
            flush();

            expect(emitted).toHaveLength(1);
            expect(emitted[0].type).toBe(
              governanceCenterActions.voteDelegationFlow.confirmationCompleted
                .type,
            );
            expect(emitted[0].payload.result.success).toBe(false);
            if (!emitted[0].payload.result.success) {
              expect(emitted[0].payload.result.error?.message).toBe('boom');
              expect(emitted[0].payload.result.errorTranslationKeys).toEqual({
                title: 'v2.governance.delegation.error.title',
                subtitle: 'v2.governance.delegation.error.subtitle',
              });
            }
          },
        }),
      );
    });
  });

  describe('makeVoteDelegationProcessing', () => {
    it('dispatches "processingResulted" on success', () => {
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeVoteDelegationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as VoteDelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );
    });

    it('dispatches "processingResulted" on failure', () => {
      const submitResult: TxSubmissionResult = {
        success: false,
        errorTranslationKeys: {
          title: 'v2.governance.delegation.error.title',
          subtitle: 'v2.governance.delegation.error.subtitle',
        },
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeVoteDelegationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as VoteDelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.voteDelegationFlow.processingResulted({
                result: submitResult,
              }),
            });
          },
        }),
      );
    });

    it('dispatches "processingResulted" failure when submitTx throws', () => {
      testSideEffect(
        {
          build: () =>
            makeVoteDelegationProcessing({
              submitTx: () => throwError(() => new Error('boom')),
            }),
        },
        ({ cold, flush }) => ({
          stateObservables: {
            voteDelegationFlow: {
              selectVoteDelegationFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  dRep: testDRep,
                  serializedTx: testSerializedTx,
                  wallet: testWallet,
                  deposit: testDeposit,
                  fees: testFees,
                } as VoteDelegationFlowState,
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
          },
          assertion: sideEffect$ => {
            const emitted: ReturnType<
              typeof governanceCenterActions.voteDelegationFlow.processingResulted
            >[] = [];
            sideEffect$.subscribe(action =>
              emitted.push(
                action as ReturnType<
                  typeof governanceCenterActions.voteDelegationFlow.processingResulted
                >,
              ),
            );
            flush();

            expect(emitted).toHaveLength(1);
            expect(emitted[0].type).toBe(
              governanceCenterActions.voteDelegationFlow.processingResulted
                .type,
            );
            expect(emitted[0].payload.result.success).toBe(false);
            if (!emitted[0].payload.result.success) {
              expect(emitted[0].payload.result.error?.message).toBe('boom');
              expect(emitted[0].payload.result.errorTranslationKeys).toEqual({
                title: 'v2.governance.delegation.error.title',
                subtitle: 'v2.governance.delegation.error.subtitle',
              });
            }
          },
        }),
      );
    });
  });

  describe('trackGovernanceDelegationConfirmed', () => {
    it('dispatches analytics event on successful processing', () => {
      testSideEffect(
        { build: () => trackGovernanceDelegationConfirmed },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            voteDelegationFlow: {
              processingResulted$: cold('a', {
                a: governanceCenterActions.voteDelegationFlow.processingResulted(
                  {
                    result: { success: true, txId: testTxId },
                  },
                ),
              }),
            },
          },
          dependencies: {
            actions: {
              ...governanceCenterActions,
              ...analyticsActions,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: analyticsActions.analytics.trackEvent({
                eventName: 'governance | drep | delegation | confirmed',
              }),
            });
          },
        }),
      );
    });

    it('dispatches analytics event on failed processing', () => {
      testSideEffect(
        { build: () => trackGovernanceDelegationConfirmed },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            voteDelegationFlow: {
              processingResulted$: cold('a', {
                a: governanceCenterActions.voteDelegationFlow.processingResulted(
                  {
                    result: {
                      success: false,
                      errorTranslationKeys: {
                        title: 'v2.governance.delegation.error.title',
                        subtitle: 'v2.governance.delegation.error.subtitle',
                      },
                    },
                  },
                ),
              }),
            },
          },
          dependencies: {
            actions: {
              ...governanceCenterActions,
              ...analyticsActions,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: analyticsActions.analytics.trackEvent({
                eventName: 'governance | drep | delegation | failed',
              }),
            });
          },
        }),
      );
    });
  });

  describe('fetchDRepsSideEffect', () => {
    const testChainId: Cardano.ChainId = { networkId: 0, networkMagic: 1 };
    const testDReps: DRepSummary[] = [
      {
        drepId: 'drep1test' as DRepSummary['drepId'],
        cip105DrepId: 'drep1testcip105' as DRepSummary['cip105DrepId'],
        hex: '227bdef7aaf3c925e97ca42d36f119b0469a12cca4a17ecfefc6900350',
        isActive: true,
        retired: false,
        expired: false,
        amount: '1000000',
        hasScript: false,
      },
    ];

    it('dispatches fetchDRepsSucceeded on successful fetch', () => {
      testSideEffect(
        { build: () => fetchDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            dRepsList: {
              fetchDRepsRequested$: cold('a', {
                a: governanceCenterActions.dRepsList.fetchDRepsRequested(),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            dRepsList: {
              selectDRepsFetchedAt$: cold('a', { a: null }),
              selectDReps$: cold('a', { a: [] as DRepSummary[] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
            cardanoProvider: {
              getDReps: () =>
                cold<Result<DRepSummary[], ProviderError>>('a', {
                  a: Ok(testDReps),
                }),
            } as unknown as CardanoProvider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.dRepsList.fetchDRepsSucceeded({
                dReps: testDReps,
              }),
            });
          },
        }),
      );
    });

    it('retries a retriable Err result transparently before dispatching fetchDRepsFailed', () => {
      testSideEffect(
        { build: () => fetchDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            dRepsList: {
              fetchDRepsRequested$: cold('a', {
                a: governanceCenterActions.dRepsList.fetchDRepsRequested(),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            dRepsList: {
              selectDRepsFetchedAt$: cold('a', { a: null }),
              selectDReps$: cold('a', { a: [] as DRepSummary[] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
            cardanoProvider: {
              getDReps: () =>
                cold<Result<DRepSummary[], ProviderError>>('a', {
                  a: Err(new ProviderError(ProviderFailure.Unknown)),
                }),
            } as unknown as CardanoProvider,
          },
          assertion: sideEffect$ => {
            // PROVIDER_REQUEST_RETRY_CONFIG: 300ms + 600ms + 1200ms = 2100ms
            expectObservable(sideEffect$).toBe('2100ms a', {
              a: governanceCenterActions.dRepsList.fetchDRepsFailed(),
            });
          },
        }),
      );
    });

    it('dispatches fetchDRepsFailed without retrying on a non-retriable Err result', () => {
      testSideEffect(
        { build: () => fetchDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            dRepsList: {
              fetchDRepsRequested$: cold('a', {
                a: governanceCenterActions.dRepsList.fetchDRepsRequested(),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            dRepsList: {
              selectDRepsFetchedAt$: cold('a', { a: null }),
              selectDReps$: cold('a', { a: [] as DRepSummary[] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
            cardanoProvider: {
              getDReps: () =>
                cold<Result<DRepSummary[], ProviderError>>('a', {
                  a: Err(new ProviderError(ProviderFailure.Forbidden)),
                }),
            } as unknown as CardanoProvider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.dRepsList.fetchDRepsFailed(),
            });
          },
        }),
      );
    });

    it('dispatches fetchDRepsFailed when chainId is not available', () => {
      testSideEffect(
        { build: () => fetchDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            dRepsList: {
              fetchDRepsRequested$: cold('a', {
                a: governanceCenterActions.dRepsList.fetchDRepsRequested(),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: undefined }),
            },
            dRepsList: {
              selectDRepsFetchedAt$: cold('a', { a: null }),
              selectDReps$: cold('a', { a: [] as DRepSummary[] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
            cardanoProvider: {
              getDReps: () => cold('-'),
            } as unknown as CardanoProvider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.dRepsList.fetchDRepsFailed(),
            });
          },
        }),
      );
    });

    it('refetches on every request even when data was recently fetched', () => {
      const recentFetchedAt = Date.now() - 1000;
      testSideEffect(
        { build: () => fetchDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            dRepsList: {
              fetchDRepsRequested$: cold('a', {
                a: governanceCenterActions.dRepsList.fetchDRepsRequested(),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            dRepsList: {
              selectDRepsFetchedAt$: cold('a', { a: recentFetchedAt }),
              selectDReps$: cold('a', { a: [] as DRepSummary[] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
            cardanoProvider: {
              getDReps: () => cold('a', { a: Ok(testDReps) }),
            } as unknown as CardanoProvider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.dRepsList.fetchDRepsSucceeded({
                dReps: testDReps,
              }),
            });
          },
        }),
      );
    });

    it('retries transparently then fails when the provider stream keeps erroring', () => {
      testSideEffect(
        { build: () => fetchDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            dRepsList: {
              fetchDRepsRequested$: cold('a', {
                a: governanceCenterActions.dRepsList.fetchDRepsRequested(),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            dRepsList: {
              selectDRepsFetchedAt$: cold('a', { a: null }),
              selectDReps$: cold('a', { a: [] as DRepSummary[] }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
            logger,
            cardanoProvider: {
              getDReps: () => throwError(() => new Error('boom')),
            } as unknown as CardanoProvider,
          },
          assertion: sideEffect$ => {
            // PROVIDER_REQUEST_RETRY_CONFIG: 300ms + 600ms + 1200ms = 2100ms
            expectObservable(sideEffect$).toBe('2100ms a', {
              a: governanceCenterActions.dRepsList.fetchDRepsFailed(),
            });
          },
        }),
      );
    });
  });

  describe('syncGovernanceFeatureFlagPayload', () => {
    it('dispatches setConfig with the promotedDreps payload', () => {
      const promotedDreps = { mainnet: [{ id: 'drep1abc' }] };
      testSideEffect(
        { build: () => syncGovernanceFeatureFlagPayload },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('a', {
                a: {
                  featureFlags: [
                    {
                      key: FEATURE_FLAG_GOVERNANCE_CENTER,
                      payload: { promotedDreps },
                    },
                  ],
                  modules: [],
                },
              }),
              selectNextFeatureFlags$: cold('a', { a: null }),
            },
          },
          dependencies: { actions: governanceCenterActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.promotedDReps.setConfig(promotedDreps),
            });
          },
        }),
      );
    });

    it('dispatches setConfig with {} when the flag has no payload', () => {
      testSideEffect(
        { build: () => syncGovernanceFeatureFlagPayload },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('a', {
                a: {
                  featureFlags: [{ key: FEATURE_FLAG_GOVERNANCE_CENTER }],
                  modules: [],
                },
              }),
              selectNextFeatureFlags$: cold('a', { a: null }),
            },
          },
          dependencies: { actions: governanceCenterActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.promotedDReps.setConfig({}),
            });
          },
        }),
      );
    });
  });

  describe('resolvePromotedDRepsSideEffect', () => {
    const testChainId: Cardano.ChainId = {
      networkId: 1,
      networkMagic: 764824073,
    };

    it('sets the active list from the config entry for the active network', () => {
      testSideEffect(
        { build: () => resolvePromotedDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            promotedDReps: {
              selectPromotedConfig$: cold('a', {
                a: { mainnet: [{ id: 'drep1abc' }] },
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.promotedDReps.setActivePromoted({
                promoted: [{ id: 'drep1abc' }],
              }),
            });
          },
        }),
      );
    });

    it('sets an empty active list when no promoted DReps for the network', () => {
      testSideEffect(
        { build: () => resolvePromotedDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            promotedDReps: {
              selectPromotedConfig$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.promotedDReps.setActivePromoted({
                promoted: [],
              }),
            });
          },
        }),
      );
    });

    it('sets an empty active list when no chainId is available', () => {
      testSideEffect(
        { build: () => resolvePromotedDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: undefined }),
            },
            promotedDReps: {
              selectPromotedConfig$: cold('a', {
                a: { mainnet: [{ id: 'drep1abc' }] },
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: governanceCenterActions.promotedDReps.setActivePromoted({
                promoted: [],
              }),
            });
          },
        }),
      );
    });

    it('re-emits setActivePromoted when the config changes', () => {
      testSideEffect(
        { build: () => resolvePromotedDRepsSideEffect },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: testChainId }),
            },
            promotedDReps: {
              selectPromotedConfig$: cold('ab', {
                a: { mainnet: [{ id: 'drep1abc' }] },
                b: { mainnet: [{ id: 'drep1def' }] },
              }),
            },
          },
          dependencies: {
            actions: governanceCenterActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('ab', {
              a: governanceCenterActions.promotedDReps.setActivePromoted({
                promoted: [{ id: 'drep1abc' }],
              }),
              b: governanceCenterActions.promotedDReps.setActivePromoted({
                promoted: [{ id: 'drep1def' }],
              }),
            });
          },
        }),
      );
    });
  });

  describe('resetDRepsOnNetworkChange', () => {
    const mainnetChainId: Cardano.ChainId = {
      networkId: 1,
      networkMagic: 764824073,
    };
    const preprodChainId: Cardano.ChainId = {
      networkId: 0,
      networkMagic: 1,
    };

    it('resets the DRep list when the active network changes', () => {
      testSideEffect(
        { build: () => resetDRepsOnNetworkChange },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a-b', {
                a: mainnetChainId,
                b: preprodChainId,
              }),
            },
          },
          dependencies: { actions: governanceCenterActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--a', {
              a: governanceCenterActions.dRepsList.resetDReps(),
            });
          },
        }),
      );
    });

    it('does not reset on the initial network, duplicates, or undefined chain ids', () => {
      testSideEffect(
        { build: () => resetDRepsOnNetworkChange },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('u-a-a', {
                u: undefined,
                a: mainnetChainId,
              }),
            },
          },
          dependencies: { actions: governanceCenterActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-----');
          },
        }),
      );
    });
  });
});

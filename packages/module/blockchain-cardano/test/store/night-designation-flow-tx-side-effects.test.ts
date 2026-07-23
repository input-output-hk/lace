import { activitiesActions, ActivityType } from '@lace-contract/activities';
import {
  LOVELACE_TOKEN_ID,
  nightDesignationFlowActions,
} from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import {
  makeNightDesignationAwaitingConfirmation,
  makeNightDesignationProcessing,
} from '../../src/store/night-designation-flow-tx-side-effects';

import type { NightDesignationFlowSliceState } from '@lace-contract/cardano-context';
import type {
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const testAccountId = AccountId('test-account');
const testWallet = {
  accounts: [{ accountId: testAccountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;
const testFees = [{ amount: BigNumber(200_000n), tokenId: LOVELACE_TOKEN_ID }];
const testSerializedTx = 'a100818258...';
const testSignedTx = 'b200818258...';
const testTxId = 'txId123';

const errorTranslationKeys = {
  title: 'v2.cnight-designation.build.error.title',
  subtitle: 'v2.cnight-designation.build.error.subtitle',
} as const;

const awaitingConfirmationState = {
  status: 'AwaitingConfirmation',
  accountId: testAccountId,
  action: 'designate',
  fees: testFees,
  serializedTx: testSerializedTx,
} as NightDesignationFlowSliceState;

const processingState = {
  status: 'Processing',
  accountId: testAccountId,
  action: 'designate',
  fees: testFees,
  serializedTx: testSignedTx,
} as NightDesignationFlowSliceState;

describe('night-designation-flow side-effects', () => {
  describe('makeNightDesignationAwaitingConfirmation', () => {
    it('calls confirmTx with the wallet that owns the active account', () => {
      const confirmTx = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            confirmTx.mockReturnValue(cold('-'));
            return makeNightDesignationAwaitingConfirmation({ confirmTx });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: awaitingConfirmationState }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: nightDesignationFlowActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
            expect(confirmTx).toHaveBeenCalledWith(
              expect.objectContaining({
                accountId: testAccountId,
                blockchainName: 'Cardano',
                serializedTx: testSerializedTx,
                wallet: testWallet,
              }),
              expect.any(Function),
            );
          },
        }),
      );
    });

    it('dispatches "confirmationCompleted" with the success result', () => {
      const confirmResult: TxConfirmationResult = {
        success: true,
        serializedTx: testSignedTx,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeNightDesignationAwaitingConfirmation({
              confirmTx: (_, mapResult) =>
                cold('a', { a: mapResult(confirmResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: awaitingConfirmationState }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: nightDesignationFlowActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: nightDesignationFlowActions.nightDesignationFlow.confirmationCompleted(
                { result: confirmResult },
              ),
            });
          },
        }),
      );
    });

    it('dispatches "confirmationCompleted" with the failure result', () => {
      const confirmResult: TxConfirmationResult = {
        success: false,
        error: { name: 'ConfirmationError', message: 'User cancelled' },
        errorTranslationKeys,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeNightDesignationAwaitingConfirmation({
              confirmTx: (_, mapResult) =>
                cold('a', { a: mapResult(confirmResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: awaitingConfirmationState }),
            },
            wallets: { selectAll$: cold('a', { a: [testWallet] }) },
          },
          dependencies: { actions: nightDesignationFlowActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: nightDesignationFlowActions.nightDesignationFlow.confirmationCompleted(
                { result: confirmResult },
              ),
            });
          },
        }),
      );
    });

    it('emits a failed "confirmationCompleted" when no wallet owns the active account', () => {
      const confirmTx = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            confirmTx.mockReturnValue(cold('-'));
            return makeNightDesignationAwaitingConfirmation({ confirmTx });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: awaitingConfirmationState }),
            },
            wallets: { selectAll$: cold('a', { a: [] as AnyWallet[] }) },
          },
          dependencies: { actions: nightDesignationFlowActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: nightDesignationFlowActions.nightDesignationFlow.confirmationCompleted(
                {
                  result: {
                    success: false,
                    errorTranslationKeys,
                  },
                },
              ),
            });
            flush();
            expect(confirmTx).not.toHaveBeenCalled();
          },
        }),
      );
    });
  });

  describe('makeNightDesignationProcessing', () => {
    it('dispatches upsertActivities + processingResulted on submission success', () => {
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
      };
      const mockTimestamp = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeNightDesignationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: processingState }),
            },
          },
          dependencies: {
            actions: {
              ...nightDesignationFlowActions,
              ...activitiesActions,
            },
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
                        amount: BigNumber(-200_000n),
                      },
                    ],
                    type: ActivityType.Pending,
                    blockchainSpecific: {
                      Cardano: {
                        consumedInputs: [],
                        producedOutputs: [],
                        nightDesignation: { action: 'designate' },
                      },
                    },
                  },
                ],
              }),
              b: nightDesignationFlowActions.nightDesignationFlow.processingResulted(
                { result: submitResult },
              ),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });

    it('threads dustPubkeyHex from slice state onto the pending activity metadata', () => {
      const dustPubkeyHex = 'c'.repeat(64);
      const stateWithPubkey = {
        ...processingState,
        dustPubkeyHex,
      } as NightDesignationFlowSliceState;
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
      };
      const mockTimestamp = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeNightDesignationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: stateWithPubkey }),
            },
          },
          dependencies: {
            actions: {
              ...nightDesignationFlowActions,
              ...activitiesActions,
            },
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
                        amount: BigNumber(-200_000n),
                      },
                    ],
                    type: ActivityType.Pending,
                    blockchainSpecific: {
                      Cardano: {
                        consumedInputs: [],
                        producedOutputs: [],
                        nightDesignation: {
                          action: 'designate',
                          dustPubkeyHex,
                        },
                      },
                    },
                  },
                ],
              }),
              b: nightDesignationFlowActions.nightDesignationFlow.processingResulted(
                { result: submitResult },
              ),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });

    it('merges upstream blockchainSpecificActivityMetadata with nightDesignation', () => {
      const upstreamConsumedInput = {
        txId: 'a'.repeat(64),
        index: 0,
      };
      const upstreamProducedOutput = {
        input: { txId: 'b'.repeat(64), index: 1 },
        output: { address: 'addr1...', value: { coins: 5n } },
      };
      const submitResult: TxSubmissionResult = {
        success: true,
        txId: testTxId,
        blockchainSpecificActivityMetadata: {
          Cardano: {
            consumedInputs: [upstreamConsumedInput],
            producedOutputs: [upstreamProducedOutput],
          },
        },
      };
      const mockTimestamp = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeNightDesignationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: processingState }),
            },
          },
          dependencies: {
            actions: {
              ...nightDesignationFlowActions,
              ...activitiesActions,
            },
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
                        amount: BigNumber(-200_000n),
                      },
                    ],
                    type: ActivityType.Pending,
                    blockchainSpecific: {
                      Cardano: {
                        consumedInputs: [upstreamConsumedInput],
                        producedOutputs: [upstreamProducedOutput],
                        nightDesignation: { action: 'designate' },
                      },
                    },
                  },
                ],
              }),
              b: nightDesignationFlowActions.nightDesignationFlow.processingResulted(
                { result: submitResult },
              ),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });

    it('dispatches only processingResulted on submission failure (no activity)', () => {
      const submitResult: TxSubmissionResult = {
        success: false,
        errorTranslationKeys,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeNightDesignationProcessing({
              submitTx: (_, mapResult) =>
                cold('a', { a: mapResult(submitResult) }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            nightDesignationFlow: {
              selectState$: cold('a', { a: processingState }),
            },
          },
          dependencies: {
            actions: {
              ...nightDesignationFlowActions,
              ...activitiesActions,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: nightDesignationFlowActions.nightDesignationFlow.processingResulted(
                { result: submitResult },
              ),
            });
          },
        }),
      );
    });
  });
});

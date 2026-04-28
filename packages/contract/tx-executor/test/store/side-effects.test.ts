import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { genericErrorResults } from '../../src';
import { makeExecuteTxPhase } from '../../src/store/side-effects';
import { txExecutorActions } from '../../src/store/slice';

import type { TxPhaseConfig } from '../../src/store/slice';
import type { MakeTxExecutorImplementation } from '../../src/types';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

import '../../src/augmentations';

const blockchainName: BlockchainName = 'Midnight';
const accountId: AccountId = 'AccountId' as AccountId;
const wallet = { accounts: [{ blockchainName, accountId }] } as AnyWallet;
const executionId = 'executionId';
const requestedType = 'submitTx';
const requestedParams = {
  serializedTx: 'serializedTx',
  wallet,
  blockchainName,
  accountId,
};
const makeTxPhaseRequested = ({
  type = requestedType,
  params = requestedParams,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
{ params?: any; type?: TxPhaseConfig['type'] } = {}) =>
  txExecutorActions.txExecutor.txPhaseRequested({
    executionId,
    config: {
      type,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      params,
    },
  });

const makeTxExecutorImplementation: MakeTxExecutorImplementation = vi
  .fn()
  .mockImplementation(() => ({
    blockchainName: 'Midnight',
    confirmTx: vi.fn().mockReturnValue(of({ success: true, serializedTx: '' })),
    buildTx: vi.fn().mockReturnValue(
      of({
        success: true as const,
        fees: [],
        serializedTx: '',
      }),
    ),
    previewTx: vi
      .fn()
      .mockReturnValue(
        of({ success: true as const, minimumAmount: BigNumber(1n) }),
      ),
    discardTx: vi.fn().mockReturnValue(of({ success: true })),
    submitTx: vi.fn().mockReturnValue(of({ success: true, txId: '' })),
  }));

const implementationFactories: MakeTxExecutorImplementation[] = [
  makeTxExecutorImplementation,
];

describe('txExecutor side-effects', () => {
  describe('makeExecuteTxPhase', () => {
    it('selects executor of active blockchain', () => {
      const restDependencies = {
        deps: 'deps',
      };
      testSideEffect(
        makeExecuteTxPhase({
          implementationFactories,
        }),
        ({ cold, expectObservable, flush }) => ({
          actionObservables: {
            txExecutor: {
              txPhaseRequested$: cold('-a', {
                a: makeTxPhaseRequested(),
              }),
            },
          },
          dependencies: { actions: txExecutorActions, ...restDependencies },
          stateObservables: {
            wallets: {
              selectAll$: cold('a', {
                a: [wallet],
              }),
            },
          },

          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: expect.any(Object) as unknown,
            });

            flush();

            expect(makeTxExecutorImplementation).toHaveBeenCalledWith(
              restDependencies,
            );
          },
        }),
      );
    });

    it('emits "txPhaseCompleted" with generic error if no executor was found', () => {
      testSideEffect(
        makeExecuteTxPhase({
          implementationFactories: [],
        }),
        ({ cold, expectObservable }) => ({
          actionObservables: {
            txExecutor: {
              txPhaseRequested$: cold('a', {
                a: makeTxPhaseRequested(),
              }),
            },
          },
          dependencies: { actions: txExecutorActions },
          stateObservables: {
            wallets: {
              selectAll$: cold('a', {
                a: [wallet],
              }),
            },
          },

          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: txExecutorActions.txExecutor.txPhaseCompleted({
                executionId,
                result: genericErrorResults[requestedType](),
              }),
            });
          },
        }),
      );
    });

    describe('when requested method is other than "confirmTx"', () => {
      it('calls requested method and emits result with "txPhaseCompleted" action', () => {
        testSideEffect(
          makeExecuteTxPhase({
            implementationFactories,
          }),
          ({ cold, expectObservable, flush }) => ({
            actionObservables: {
              txExecutor: {
                txPhaseRequested$: cold('a', {
                  a: makeTxPhaseRequested(),
                }),
              },
            },
            dependencies: { actions: txExecutorActions },
            stateObservables: {
              wallets: {
                selectAll$: cold('a', {
                  a: [wallet],
                }),
              },
            },

            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: txExecutorActions.txExecutor.txPhaseCompleted({
                  executionId,
                  result: {
                    success: true,
                    txId: '',
                  },
                }),
              });

              flush();
            },
          }),
        );
      });
    });

    describe('when requested method is "confirmTx"', () => {
      it('calls "confirmTx" with received params', () => {
        const requestedMethodMock = vi.fn();
        testSideEffect(
          {
            build: ({ cold }) => {
              requestedMethodMock.mockReturnValue(cold(''));

              const makeTxExecutorImplementation: MakeTxExecutorImplementation =
                vi.fn().mockImplementation(() => ({
                  blockchainName: 'Midnight',
                  confirmTx: requestedMethodMock,
                }));

              const implementationFactories: MakeTxExecutorImplementation[] = [
                makeTxExecutorImplementation,
              ];
              return makeExecuteTxPhase({
                implementationFactories,
              });
            },
          },
          ({ cold, expectObservable, flush }) => {
            return {
              actionObservables: {
                txExecutor: {
                  txPhaseRequested$: cold('-a', {
                    a: makeTxPhaseRequested({ type: 'confirmTx' }),
                  }),
                },
              },
              dependencies: {
                actions: txExecutorActions,
              },
              stateObservables: {
                wallets: {
                  selectAll$: cold('a', {
                    a: [wallet],
                  }),
                },
              },

              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('-');

                flush();

                expect(requestedMethodMock).toHaveBeenCalledWith(
                  expect.objectContaining({
                    blockchainName: 'Midnight',
                    serializedTx: 'serializedTx',
                    accountId,
                    wallet,
                  }),
                );
              },
            };
          },
        );
      });

      it('emits result of "confirmTx" with "txPhaseCompleted" action', () => {
        testSideEffect(
          makeExecuteTxPhase({
            implementationFactories,
          }),
          ({ cold, expectObservable }) => ({
            actionObservables: {
              txExecutor: {
                txPhaseRequested$: cold('a', {
                  a: makeTxPhaseRequested({ type: 'confirmTx' }),
                }),
              },
            },
            dependencies: {
              actions: txExecutorActions,
            },
            stateObservables: {
              wallets: {
                selectAll$: cold('a', {
                  a: [wallet],
                }),
              },
            },

            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: txExecutorActions.txExecutor.txPhaseCompleted({
                  executionId,
                  result: {
                    serializedTx: '',
                    success: true,
                  },
                }),
              });
            },
          }),
        );
      });

      it('throws an error when accountId is not found in the provided wallet (confirmTx path)', () => {
        const invalidWallet = {
          accounts: [{ blockchainName, accountId: 'different-account' }],
        } as AnyWallet;

        testSideEffect(
          makeExecuteTxPhase({
            implementationFactories,
          }),
          ({ cold, expectObservable }) => ({
            actionObservables: {
              txExecutor: {
                txPhaseRequested$: cold('-a', {
                  a: txExecutorActions.txExecutor.txPhaseRequested({
                    executionId,
                    config: {
                      type: 'confirmTx',
                      params: {
                        serializedTx: 'serializedTx',
                        wallet: invalidWallet,
                        accountId,
                        blockchainName,
                        blockchainSpecificSendFlowData: {},
                      },
                    },
                  }),
                }),
              },
            },
            dependencies: {
              actions: txExecutorActions,
            },
            stateObservables: {
              wallets: {
                selectAll$: cold('a', { a: [invalidWallet] }),
              },
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe(
                '-#',
                undefined,
                new Error(`Account ${accountId} not found in provided wallet`),
              );
            },
          }),
        );
      });
    });
  });
});

import { Cardano } from '@cardano-sdk/core';
import {
  cardanoContextActions,
  collateralFlowActions,
  COLLATERAL_AMOUNT_LOVELACES,
  utxoKey,
} from '@lace-contract/cardano-context';
import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, it, vi } from 'vitest';

import { awaitingUtxoSideEffect } from '../../src/store/side-effects/awaiting-utxo';
import { buildingSideEffect } from '../../src/store/side-effects/building';
import { confirmingSideEffect } from '../../src/store/side-effects/confirming';
import { discardingSideEffect } from '../../src/store/side-effects/discarding';
import { reclaimingSideEffect } from '../../src/store/side-effects/reclaiming';
import { requestedSideEffect } from '../../src/store/side-effects/requested';
import { settingUnspendableSideEffect } from '../../src/store/side-effects/setting-unspendable';
import { submittingSideEffect } from '../../src/store/side-effects/submitting';

import {
  account0someAdaTokens,
  cardanoAccount0Addr,
  threeAccountCardanoWallet,
  threeAccountCardanoWalletAccounts,
} from './mocks';

import type { CollateralFlowSliceState } from '@lace-contract/cardano-context';
import type { Token } from '@lace-contract/tokens';
import type { TxBuildResult } from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

vi.mock('@lace-contract/tx-executor', async importOriginal => {
  const actual = await importOriginal();
  const makeStub =
    <T>(result: T) =>
    () =>
    (_params: unknown, mapResult: (r: T) => unknown) =>
      of(mapResult(result));
  return {
    ...(actual as object),
    makeBuildTx: makeStub({
      success: true as const,
      fees: [],
      serializedTx: 'serializedTx',
    }),
    makeConfirmTx: makeStub({
      success: true as const,
      serializedTx: 'signedTx',
    }),
    makeSubmitTx: makeStub({
      success: true as const,
      txId: 'txId123',
    }),
    makeDiscardTx: makeStub({ success: true as const }),
  };
});

const testAccountId = threeAccountCardanoWalletAccounts[0].accountId;
const testWallet = {
  accounts: threeAccountCardanoWalletAccounts,
} as unknown as AnyWallet;

/** Cardano address and ADA token for testAccountId (for building side effect). */
const testCardanoAddress = { ...cardanoAccount0Addr, accountId: testAccountId };
const testAdaToken = { ...account0someAdaTokens, accountId: testAccountId };

/** Eligible collateral UTXO: exactly 5 ADA, no assets. Reuse address from mocks. */
const eligibleCollateralUtxo: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    ),
    txId: Cardano.TransactionId(
      '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    ),
    value: {
      coins: BigInt(COLLATERAL_AMOUNT_LOVELACES),
      assets: new Map(),
    },
  },
];

const actions = { ...cardanoContextActions, ...collateralFlowActions };

const stateAwaitingUtxoWithTxId = (txId: string) =>
  ({
    status: 'AwaitingUtxo',
    accountId: testAccountId,
    txId,
    wallet: testWallet,
  } satisfies CollateralFlowSliceState);

describe('collateral-flow sideEffects', () => {
  describe('awaitingUtxoSideEffect', () => {
    it('emits setAccountUnspendableUtxos and utxoFound when expected collateral UTXO is in account UTXOs (immediate or later)', () => {
      const txId = eligibleCollateralUtxo[0].txId.toString();
      testSideEffect(awaitingUtxoSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUtxos$: cold('a', {
              a: { [testAccountId]: [eligibleCollateralUtxo] },
            }),
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: stateAwaitingUtxoWithTxId(txId),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUnspendableUtxos({
              accountId: testAccountId,
              utxos: [eligibleCollateralUtxo],
            }),
            b: actions.collateralFlow.utxoFound(),
          });
        },
      }));
    });

    it('emits setAccountUnspendableUtxos and utxoFound when UTXO appears on a later selectAccountUtxos$ emission', () => {
      const txId = eligibleCollateralUtxo[0].txId.toString();
      testSideEffect(awaitingUtxoSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUtxos$: cold('a-b', {
              a: { [testAccountId]: [] },
              b: { [testAccountId]: [eligibleCollateralUtxo] },
            }),
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: stateAwaitingUtxoWithTxId(txId),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          // UTXO not in first snapshot; appears at frame 2 from selectAccountUtxos$
          expectObservable(sideEffect$).toBe('2ms (ab)', {
            a: actions.cardanoContext.setAccountUnspendableUtxos({
              accountId: testAccountId,
              utxos: [eligibleCollateralUtxo],
            }),
            b: actions.collateralFlow.utxoFound(),
          });
        },
      }));
    });

    it('does not match UTXO when amount differs from collateral (5 ADA)', () => {
      const utxoWrongAmount: Cardano.Utxo = [
        eligibleCollateralUtxo[0],
        {
          ...eligibleCollateralUtxo[1],
          value: {
            coins: BigInt(COLLATERAL_AMOUNT_LOVELACES - 1),
            assets: new Map(),
          },
        },
      ];
      const txId = eligibleCollateralUtxo[0].txId.toString();
      testSideEffect(awaitingUtxoSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUtxos$: cold('a', {
              a: { [testAccountId]: [utxoWrongAmount] },
            }),
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: stateAwaitingUtxoWithTxId(txId),
            }),
          },
        },
        dependencies: { actions, logger: dummyLogger },
        assertion: sideEffect$ => {
          // Timeout is 2 min (120000ms); UTXO never matches (wrong amount)
          expectObservable(sideEffect$, '^ 120001ms !').toBe('120000ms a', {
            a: actions.collateralFlow.utxoTimeout(),
          });
        },
      }));
    });
  });

  describe('buildingSideEffect', () => {
    it('emits buildCompleted when build succeeds (tx-executor mocked)', () => {
      const buildResult: TxBuildResult = {
        success: true,
        fees: [],
        serializedTx: 'serializedTx',
      };
      testSideEffect(buildingSideEffect, ({ cold, expectObservable }) => ({
        actionObservables: {
          txExecutor: { txPhaseCompleted$: cold('') },
        },
        stateObservables: {
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Building',
                accountId: testAccountId,
                wallet: testWallet,
              } satisfies CollateralFlowSliceState,
            }),
          },
          wallets: {
            selectAll$: cold('a', { a: [threeAccountCardanoWallet] }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [testCardanoAddress] }),
          },
          tokens: {
            selectTokensGroupedByAccount$: cold('a', {
              a: {
                [testAccountId]: {
                  fungible: [testAdaToken] as Token[],
                  nfts: [],
                },
              },
            }),
          },
        },
        dependencies: { actions, logger: dummyLogger },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.buildCompleted({ result: buildResult }),
          });
        },
      }));
    });

    it('emits buildCompleted with success false when wallet/account not found', () => {
      testSideEffect(buildingSideEffect, ({ cold, expectObservable }) => ({
        actionObservables: {
          txExecutor: { txPhaseCompleted$: cold('') },
        },
        stateObservables: {
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Building',
                accountId: testAccountId,
                wallet: testWallet,
              } satisfies CollateralFlowSliceState,
            }),
          },
          wallets: { selectAll$: cold('a', { a: [] }) },
          addresses: { selectAllAddresses$: cold('a', { a: [] }) },
          tokens: { selectTokensGroupedByAccount$: cold('a', { a: {} }) },
        },
        dependencies: { actions, logger: dummyLogger },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.buildCompleted({
              result: {
                success: false,
                errorTranslationKey: 'collateral.sheet.failure.title',
              },
            }),
          });
        },
      }));
    });

    it('emits buildCompleted with success false when no Cardano address for account', () => {
      testSideEffect(buildingSideEffect, ({ cold, expectObservable }) => ({
        actionObservables: {
          txExecutor: { txPhaseCompleted$: cold('') },
        },
        stateObservables: {
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Building',
                accountId: testAccountId,
                wallet: testWallet,
              } satisfies CollateralFlowSliceState,
            }),
          },
          wallets: {
            selectAll$: cold('a', { a: [threeAccountCardanoWallet] }),
          },
          addresses: { selectAllAddresses$: cold('a', { a: [] }) },
          tokens: {
            selectTokensGroupedByAccount$: cold('a', {
              a: {
                [testAccountId]: {
                  fungible: [testAdaToken] as Token[],
                  nfts: [],
                },
              },
            }),
          },
        },
        dependencies: { actions, logger: dummyLogger },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.buildCompleted({
              result: {
                success: false,
                errorTranslationKey: 'collateral.sheet.failure.title',
              },
            }),
          });
        },
      }));
    });

    it('emits insufficientBalance when ADA token not found for account', () => {
      testSideEffect(buildingSideEffect, ({ cold, expectObservable }) => ({
        actionObservables: {
          txExecutor: { txPhaseCompleted$: cold('') },
        },
        stateObservables: {
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Building',
                accountId: testAccountId,
                wallet: testWallet,
              } satisfies CollateralFlowSliceState,
            }),
          },
          wallets: {
            selectAll$: cold('a', { a: [threeAccountCardanoWallet] }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [testCardanoAddress] }),
          },
          tokens: {
            selectTokensGroupedByAccount$: cold('a', { a: {} }),
          },
        },
        dependencies: { actions, logger: dummyLogger },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.insufficientBalance(),
          });
        },
      }));
    });
  });

  describe('confirmingSideEffect', () => {
    it('emits confirmationCompleted when confirm succeeds (tx-executor mocked)', () => {
      const confirmResult = {
        success: true as const,
        serializedTx: 'signedTx',
      };
      testSideEffect(confirmingSideEffect, ({ cold, expectObservable }) => ({
        actionObservables: {
          txExecutor: { txPhaseCompleted$: cold('') },
        },
        stateObservables: {
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Confirming',
                accountId: testAccountId,
                wallet: testWallet,
                fees: [],
                serializedTx: 'serializedTx',
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.confirmationCompleted({
              result: confirmResult,
            }),
          });
        },
      }));
    });
  });

  describe('submittingSideEffect', () => {
    it('emits submissionCompleted when submit succeeds (tx-executor mocked)', () => {
      const submitResult = {
        success: true as const,
        txId: 'txId123',
      };
      testSideEffect(submittingSideEffect, ({ cold, expectObservable }) => ({
        actionObservables: {
          txExecutor: { txPhaseCompleted$: cold('') },
        },
        stateObservables: {
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Submitting',
                accountId: testAccountId,
                wallet: testWallet,
                fees: [],
                serializedTx: 'signedTx',
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.submissionCompleted({
              result: submitResult,
            }),
          });
        },
      }));
    });
  });

  describe('discardingSideEffect', () => {
    it('emits discardingTxCompleted when discard succeeds (tx-executor mocked)', () => {
      testSideEffect(discardingSideEffect, ({ cold, expectObservable }) => ({
        actionObservables: {
          txExecutor: { txPhaseCompleted$: cold('') },
        },
        stateObservables: {
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'DiscardingTx',
                serializedTx: 'serializedTx',
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions, logger: dummyLogger },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.discardingTxCompleted(),
          });
        },
      }));
    });
  });

  describe('requestedSideEffect', () => {
    it('emits unspendableUtxoFound when account has unspendable UTXOs', () => {
      testSideEffect(requestedSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [eligibleCollateralUtxo] },
            }),
            selectAccountUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Requested',
                accountId: testAccountId,
                wallet: testWallet,
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.unspendableUtxoFound({
              txKey: utxoKey(eligibleCollateralUtxo),
            }),
          });
        },
      }));
    });

    it('emits eligibleCollateralFound when account has eligible collateral UTXO and no unspendable', () => {
      testSideEffect(requestedSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
            selectAccountUtxos$: cold('a', {
              a: { [testAccountId]: [eligibleCollateralUtxo] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Requested',
                accountId: testAccountId,
                wallet: testWallet,
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.eligibleCollateralFound({
              txKey: utxoKey(eligibleCollateralUtxo),
            }),
          });
        },
      }));
    });

    it('emits noUnspendableUtxo when account has no unspendable and no eligible collateral', () => {
      testSideEffect(requestedSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
            selectAccountUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Requested',
                accountId: testAccountId,
                wallet: testWallet,
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.noUnspendableUtxo(),
          });
        },
      }));
    });
  });

  describe('settingUnspendableSideEffect', () => {
    it('emits setAccountUnspendableUtxos and utxoSet when UTXO found', () => {
      testSideEffect(
        settingUnspendableSideEffect,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectAccountUtxos$: cold('a', {
                a: { [testAccountId]: [eligibleCollateralUtxo] },
              }),
              selectAccountUnspendableUtxos$: cold('a', {
                a: { [testAccountId]: [] },
              }),
            },
            collateralFlow: {
              selectState$: cold('a', {
                a: {
                  status: 'SettingUnspendable',
                  accountId: testAccountId,
                  txKey: utxoKey(eligibleCollateralUtxo),
                } satisfies CollateralFlowSliceState,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // merge(of(setAccountUnspendableUtxos), of(utxoSet)) emits both at frame 0
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.cardanoContext.setAccountUnspendableUtxos({
                accountId: testAccountId,
                utxos: [eligibleCollateralUtxo],
              }),
              b: actions.collateralFlow.utxoSet(),
            });
          },
        }),
      );
    });

    it('emits utxoNotFound when UTXO not in account utxos', () => {
      testSideEffect(
        settingUnspendableSideEffect,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectAccountUtxos$: cold('a', {
                a: { [testAccountId]: [] },
              }),
              selectAccountUnspendableUtxos$: cold('a', {
                a: { [testAccountId]: [] },
              }),
            },
            collateralFlow: {
              selectState$: cold('a', {
                a: {
                  status: 'SettingUnspendable',
                  accountId: testAccountId,
                  txKey: 'missing-txId#0',
                } satisfies CollateralFlowSliceState,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.collateralFlow.utxoNotFound(),
            });
          },
        }),
      );
    });
  });

  describe('reclaimingSideEffect', () => {
    it('emits setAccountUnspendableUtxos and reclaimSucceeded when txKey removed from unspendable', () => {
      testSideEffect(reclaimingSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [eligibleCollateralUtxo] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Reclaiming',
                accountId: testAccountId,
                txKey: utxoKey(eligibleCollateralUtxo),
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          // merge emits both at frame 0
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUnspendableUtxos({
              accountId: testAccountId,
              utxos: [],
            }),
            b: actions.collateralFlow.reclaimSucceeded(),
          });
        },
      }));
    });

    it('emits reclaimSucceeded when txKey not in unspendable list', () => {
      testSideEffect(reclaimingSideEffect, ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUnspendableUtxos$: cold('a', {
              a: { [testAccountId]: [] },
            }),
          },
          collateralFlow: {
            selectState$: cold('a', {
              a: {
                status: 'Reclaiming',
                accountId: testAccountId,
                txKey: 'txId#0',
              } satisfies CollateralFlowSliceState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.collateralFlow.reclaimSucceeded(),
          });
        },
      }));
    });
  });
});

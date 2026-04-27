import { collateralFlowMachine } from '@lace-contract/cardano-context';
import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import type { CollateralFlowSliceState } from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type {
  TxBuildResult,
  TxConfirmationResult,
  TxErrorTranslationKeys,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<Status extends CollateralFlowSliceState['status']> =
  CollateralFlowSliceState & { status: Status };

const testAccountId = 'test-account' as AccountId;
const testWallet = { accounts: [] } as unknown as AnyWallet;

const execute = makeStateMachineExecutor(collateralFlowMachine);
const stateIdle = collateralFlowMachine.initialState;

const stateRequested = execute(
  stateIdle,
  collateralFlowMachine.events.buildRequested({
    accountId: testAccountId,
    wallet: testWallet,
  }),
) as StateWithStatusOf<'Requested'>;

const stateBuilding = execute(
  stateRequested,
  collateralFlowMachine.events.noUnspendableUtxo(),
) as StateWithStatusOf<'Building'>;

const buildSuccessResult: TxBuildResult = {
  success: true,
  fees: [],
  serializedTx: 'serializedTx',
};
const stateReadyFromBuild = execute(
  stateBuilding,
  collateralFlowMachine.events.buildCompleted({ result: buildSuccessResult }),
) as StateWithStatusOf<'Ready'>;

const stateReadyWithTxKey = execute(
  stateRequested,
  collateralFlowMachine.events.eligibleCollateralFound({ txKey: 'txId#0' }),
) as StateWithStatusOf<'Ready'>;

const stateConfirming = execute(
  stateReadyFromBuild,
  collateralFlowMachine.events.confirmed(),
) as StateWithStatusOf<'Confirming'>;

const stateSubmitting = execute(
  stateConfirming,
  collateralFlowMachine.events.confirmationCompleted({
    result: { success: true, serializedTx: 'signedTx' },
  }),
) as StateWithStatusOf<'Submitting'>;

const stateAwaitingUtxo = execute(
  stateSubmitting,
  collateralFlowMachine.events.submissionCompleted({
    result: { success: true, txId: 'txId123' },
  }),
) as StateWithStatusOf<'AwaitingUtxo'>;

const stateSet = execute(
  stateRequested,
  collateralFlowMachine.events.unspendableUtxoFound({ txKey: 'txId#0' }),
) as StateWithStatusOf<'Set'>;

const stateReclaiming = execute(
  stateSet,
  collateralFlowMachine.events.reclaimRequested(),
) as StateWithStatusOf<'Reclaiming'>;

describe('collateral-flow stateMachine', () => {
  describe('Idle', () => {
    it('switches to "Requested" when received "buildRequested" event', () => {
      const state = execute(
        stateIdle,
        collateralFlowMachine.events.buildRequested({
          accountId: testAccountId,
          wallet: testWallet,
        }),
      );

      expect(state).toEqual({
        status: 'Requested',
        accountId: testAccountId,
        wallet: testWallet,
      });
    });

    it('stays at "Idle" when received "closed" event', () => {
      const state = execute(stateIdle, collateralFlowMachine.events.closed());
      expect(state).toEqual(collateralFlowMachine.initialState);
    });
  });

  describe('Requested', () => {
    it('switches to "Set" when "unspendableUtxoFound" with txKey', () => {
      const state = execute(
        stateRequested,
        collateralFlowMachine.events.unspendableUtxoFound({ txKey: 'txId#1' }),
      ) as StateWithStatusOf<'Set'>;

      expect(state.status).toEqual('Set');
      expect(state.accountId).toEqual(testAccountId);
      expect(state.txKey).toEqual('txId#1');
    });

    it('switches to "Building" when "noUnspendableUtxo"', () => {
      const state = execute(
        stateRequested,
        collateralFlowMachine.events.noUnspendableUtxo(),
      ) as StateWithStatusOf<'Building'>;

      expect(state.status).toEqual('Building');
      expect(state.accountId).toEqual(testAccountId);
      expect(state.wallet).toEqual(testWallet);
    });

    it('switches to "Ready" when "eligibleCollateralFound" with txKey', () => {
      const state = execute(
        stateRequested,
        collateralFlowMachine.events.eligibleCollateralFound({
          txKey: 'txId#0',
        }),
      ) as StateWithStatusOf<'Ready'>;

      expect(state.status).toEqual('Ready');
      expect(state.accountId).toEqual(testAccountId);
      expect(state.wallet).toEqual(testWallet);
      expect(state.txKey).toEqual('txId#0');
    });

    it('switches to "Idle" when "closed"', () => {
      const state = execute(
        stateRequested,
        collateralFlowMachine.events.closed(),
      );
      expect(state.status).toEqual('Idle');
    });
  });

  describe('Building', () => {
    it('switches to "NotEnoughBalance" when "insufficientBalance"', () => {
      const state = execute(
        stateBuilding,
        collateralFlowMachine.events.insufficientBalance(),
      ) as StateWithStatusOf<'NotEnoughBalance'>;

      expect(state.status).toEqual('NotEnoughBalance');
      expect(state.accountId).toEqual(testAccountId);
    });

    it('switches to "Ready" when "buildCompleted" with success result', () => {
      const state = execute(
        stateBuilding,
        collateralFlowMachine.events.buildCompleted({
          result: buildSuccessResult,
        }),
      ) as StateWithStatusOf<'Ready'>;

      expect(state.status).toEqual('Ready');
      expect(state.fees).toEqual(buildSuccessResult.fees);
      expect(state.serializedTx).toEqual(buildSuccessResult.serializedTx);
    });

    it('switches to "NotEnoughBalance" when "buildCompleted" with failure result', () => {
      const failureResult: TxBuildResult = {
        success: false,
        errorTranslationKey: 'send-flow.errors.buildFailed' as TranslationKey,
      };
      const state = execute(
        stateBuilding,
        collateralFlowMachine.events.buildCompleted({ result: failureResult }),
      ) as StateWithStatusOf<'NotEnoughBalance'>;

      expect(state.status).toEqual('NotEnoughBalance');
      expect(state.accountId).toEqual(testAccountId);
    });

    it('switches to "NotEnoughBalance" when "buildCompleted" with failure result (missing wallet/account/address)', () => {
      const failureResult: TxBuildResult = {
        success: false,
        errorTranslationKey: 'collateral.sheet.failure.title' as TranslationKey,
      };
      const state = execute(
        stateBuilding,
        collateralFlowMachine.events.buildCompleted({ result: failureResult }),
      ) as StateWithStatusOf<'NotEnoughBalance'>;

      expect(state.status).toEqual('NotEnoughBalance');
      expect(state.accountId).toEqual(testAccountId);
    });

    it('switches to "Idle" when "closed"', () => {
      const state = execute(
        stateBuilding,
        collateralFlowMachine.events.closed(),
      );
      expect(state.status).toEqual('Idle');
    });
  });

  describe('Ready', () => {
    it('switches to "SettingUnspendable" when "confirmed" and state has txKey', () => {
      const state = execute(
        stateReadyWithTxKey,
        collateralFlowMachine.events.confirmed(),
      ) as StateWithStatusOf<'SettingUnspendable'>;

      expect(state.status).toEqual('SettingUnspendable');
      expect(state.accountId).toEqual(testAccountId);
      expect(state.txKey).toEqual('txId#0');
    });

    it('switches to "Confirming" when "confirmed" and state has fees and serializedTx', () => {
      const state = execute(
        stateReadyFromBuild,
        collateralFlowMachine.events.confirmed(),
      ) as StateWithStatusOf<'Confirming'>;

      expect(state.status).toEqual('Confirming');
      expect(state.fees).toEqual(stateReadyFromBuild.fees);
      expect(state.serializedTx).toEqual(stateReadyFromBuild.serializedTx);
    });

    it('switches to "Failure" when "confirmed" and state lacks fees/serializedTx (no txKey)', () => {
      const stateReadyMissingFields = {
        status: 'Ready',
        accountId: testAccountId,
        wallet: testWallet,
      } as StateWithStatusOf<'Ready'>;
      const state = execute(
        stateReadyMissingFields,
        collateralFlowMachine.events.confirmed(),
      ) as StateWithStatusOf<'Failure'>;

      expect(state.status).toEqual('Failure');
      expect(state.errorTranslationKeys).toEqual({
        title: 'collateral.sheet.failure.title',
        subtitle: 'collateral.sheet.failure.subtitle',
      });
    });

    it('switches to "DiscardingTx" when "closed" and state has serializedTx', () => {
      const state = execute(
        stateReadyFromBuild,
        collateralFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      expect(state.status).toEqual('DiscardingTx');
      expect(state.serializedTx).toEqual(stateReadyFromBuild.serializedTx);
    });

    it('switches to "Idle" when "closed" and state has no serializedTx', () => {
      const state = execute(
        stateReadyWithTxKey,
        collateralFlowMachine.events.closed(),
      );
      expect(state.status).toEqual('Idle');
    });
  });

  describe('NotEnoughBalance', () => {
    it('switches to "Idle" when "closed"', () => {
      const stateNotEnoughBalance = execute(
        stateBuilding,
        collateralFlowMachine.events.insufficientBalance(),
      );
      const state = execute(
        stateNotEnoughBalance,
        collateralFlowMachine.events.closed(),
      );
      expect(state.status).toEqual('Idle');
    });
  });

  describe('Confirming', () => {
    it('switches to "Submitting" when "confirmationCompleted" with success', () => {
      const successResult: TxConfirmationResult = {
        success: true,
        serializedTx: 'signedTx',
      };
      const state = execute(
        stateConfirming,
        collateralFlowMachine.events.confirmationCompleted({
          result: successResult,
        }),
      ) as StateWithStatusOf<'Submitting'>;

      expect(state.status).toEqual('Submitting');
      expect(state.serializedTx).toEqual('signedTx');
    });

    it('switches to "Failure" when "confirmationCompleted" with failure', () => {
      const failureResult: TxConfirmationResult = {
        success: false,
        errorTranslationKeys: {
          title:
            'tx-executor.confirmation-error.generic.title' as TranslationKey,
          subtitle:
            'tx-executor.confirmation-error.generic.subtitle' as TranslationKey,
        },
      };
      const state = execute(
        stateConfirming,
        collateralFlowMachine.events.confirmationCompleted({
          result: failureResult,
        }),
      ) as StateWithStatusOf<'Failure'>;

      expect(state.status).toEqual('Failure');
    });

    it('switches to "DiscardingTx" when "closed" and state has serializedTx', () => {
      const state = execute(
        stateConfirming,
        collateralFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      expect(state.status).toEqual('DiscardingTx');
      expect(state.serializedTx).toEqual(stateConfirming.serializedTx);
    });
  });

  describe('Submitting', () => {
    it('switches to "AwaitingUtxo" when "submissionCompleted" with success', () => {
      const state = execute(
        stateSubmitting,
        collateralFlowMachine.events.submissionCompleted({
          result: { success: true, txId: 'txId123' },
        }),
      ) as StateWithStatusOf<'AwaitingUtxo'>;

      expect(state.status).toEqual('AwaitingUtxo');
      expect(state.txId).toEqual('txId123');
    });

    it('switches to "Failure" when "submissionCompleted" with failure', () => {
      const txErrorTranslationKeys: TxErrorTranslationKeys = {
        title: 'tx-executor.submission-error.generic.title' as TranslationKey,
        subtitle:
          'tx-executor.submission-error.generic.subtitle' as TranslationKey,
      };
      const failureResult: TxSubmissionResult = {
        success: false,
        error: { name: 'Error', message: 'submit failed' },
        errorTranslationKeys: txErrorTranslationKeys,
      };
      const state = execute(
        stateSubmitting,
        collateralFlowMachine.events.submissionCompleted({
          result: failureResult,
        }),
      ) as StateWithStatusOf<'Failure'>;

      expect(state.status).toEqual('Failure');
      expect(state.error).toEqual(failureResult.error);
      expect(state.errorTranslationKeys).toEqual(
        failureResult.errorTranslationKeys,
      );
    });

    it('stays in "Submitting" when "closed"', () => {
      const state = execute(
        stateSubmitting,
        collateralFlowMachine.events.closed(),
      ) as StateWithStatusOf<'Submitting'>;
      expect(state.status).toEqual('Submitting');
    });
  });

  describe('SettingUnspendable', () => {
    const stateSettingUnspendable = execute(
      stateReadyWithTxKey,
      collateralFlowMachine.events.confirmed(),
    ) as StateWithStatusOf<'SettingUnspendable'>;

    it('switches to "Idle" when "utxoSet"', () => {
      const state = execute(
        stateSettingUnspendable,
        collateralFlowMachine.events.utxoSet(),
      );
      expect(state.status).toEqual('Idle');
    });

    it('switches to "Failure" when "utxoNotFound"', () => {
      const state = execute(
        stateSettingUnspendable,
        collateralFlowMachine.events.utxoNotFound(),
      ) as StateWithStatusOf<'Failure'>;

      expect(state.status).toEqual('Failure');
      expect(state.errorTranslationKeys?.title).toEqual(
        'collateral.sheet.failure.title',
      );
      expect(state.errorTranslationKeys?.subtitle).toEqual(
        'collateral.sheet.failure.subtitle',
      );
    });

    it('switches to "Idle" when "closed"', () => {
      const state = execute(
        stateSettingUnspendable,
        collateralFlowMachine.events.closed(),
      );
      expect(state.status).toEqual('Idle');
    });
  });

  describe('AwaitingUtxo', () => {
    it('switches to "Idle" when "utxoFound"', () => {
      const state = execute(
        stateAwaitingUtxo,
        collateralFlowMachine.events.utxoFound(),
      );
      expect(state.status).toEqual('Idle');
    });

    it('switches to "Failure" when "utxoTimeout"', () => {
      const state = execute(
        stateAwaitingUtxo,
        collateralFlowMachine.events.utxoTimeout(),
      ) as StateWithStatusOf<'Failure'>;

      expect(state.status).toEqual('Failure');
      expect(state.errorTranslationKeys?.title).toEqual(
        'collateral.sheet.failure.title',
      );
      expect(state.errorTranslationKeys?.subtitle).toEqual(
        'collateral.sheet.failure.subtitle',
      );
    });

    it('stays in "AwaitingUtxo" when "closed"', () => {
      const state = execute(
        stateAwaitingUtxo,
        collateralFlowMachine.events.closed(),
      ) as StateWithStatusOf<'AwaitingUtxo'>;
      expect(state.status).toEqual('AwaitingUtxo');
    });
  });

  describe('Set', () => {
    it('switches to "Reclaiming" when "reclaimRequested"', () => {
      const state = execute(
        stateSet,
        collateralFlowMachine.events.reclaimRequested(),
      ) as StateWithStatusOf<'Reclaiming'>;

      expect(state.status).toEqual('Reclaiming');
      expect(state.accountId).toEqual(stateSet.accountId);
      expect(state.txKey).toEqual(stateSet.txKey);
    });

    it('switches to "Idle" when "closed"', () => {
      const state = execute(stateSet, collateralFlowMachine.events.closed());
      expect(state.status).toEqual('Idle');
    });
  });

  describe('Reclaiming', () => {
    it('switches to "Idle" when "reclaimSucceeded"', () => {
      const state = execute(
        stateReclaiming,
        collateralFlowMachine.events.reclaimSucceeded(),
      );
      expect(state.status).toEqual('Idle');
    });

    it('switches to "Idle" when "closed"', () => {
      const state = execute(
        stateReclaiming,
        collateralFlowMachine.events.closed(),
      );
      expect(state.status).toEqual('Idle');
    });
  });

  describe('Failure', () => {
    const stateFailureWithNoSerializedTx = execute(
      {
        status: 'Ready',
        accountId: testAccountId,
        wallet: testWallet,
      } as StateWithStatusOf<'Ready'>,
      collateralFlowMachine.events.confirmed(),
    ) as StateWithStatusOf<'Failure'>;

    const stateFailureWithSerializedTx = execute(
      stateConfirming,
      collateralFlowMachine.events.confirmationCompleted({
        result: { success: true, serializedTx: 'signedTx' },
      }),
      collateralFlowMachine.events.submissionCompleted({
        result: {
          success: false,
          error: { name: 'Error', message: 'submit failed' },
          errorTranslationKeys: {
            title:
              'tx-executor.submission-error.generic.title' as TranslationKey,
            subtitle:
              'tx-executor.submission-error.generic.subtitle' as TranslationKey,
          },
        },
      }),
    ) as StateWithStatusOf<'Failure'>;

    it('switches to "DiscardingTx" when "closed" and state has serializedTx', () => {
      const state = execute(
        stateFailureWithSerializedTx,
        collateralFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      expect(state.status).toEqual('DiscardingTx');
      expect(state.serializedTx).toEqual('signedTx');
    });

    it('switches to "Idle" when "closed" and state has no serializedTx', () => {
      const state = execute(
        stateFailureWithNoSerializedTx,
        collateralFlowMachine.events.closed(),
      );
      expect(state.status).toEqual('Idle');
    });
  });

  describe('DiscardingTx', () => {
    it('switches to "Idle" when "discardingTxCompleted"', () => {
      const stateDiscardingTx = execute(
        stateReadyFromBuild,
        collateralFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      const state = execute(
        stateDiscardingTx,
        collateralFlowMachine.events.discardingTxCompleted(),
      );
      expect(state.status).toEqual('Idle');
    });
  });
});

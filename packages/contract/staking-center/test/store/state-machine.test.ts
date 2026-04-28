import { Cardano } from '@cardano-sdk/core';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it, vi } from 'vitest';

import { delegationFlowMachine } from '../../src/store/state-machine';

import type { DelegationFlowState } from '../../src/store/types';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<Status extends DelegationFlowState['status']> =
  DelegationFlowState & { status: Status };

const execute = makeStateMachineExecutor(delegationFlowMachine);

const testAccountId = 'test-account' as AccountId;
const testPoolId = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);
const testWallet = { accounts: [] } as unknown as AnyWallet;
const testFees = [{ amount: BigNumber(200000n), tokenId: LOVELACE_TOKEN_ID }];
const testDeposit = '2000000';
const testSerializedTx = 'a100818258...';
const testTxId = 'txId123';
const txErrorTranslationKeys: TxErrorTranslationKeys = {
  title: 'v2.staking.delegation.error.title',
  subtitle: 'v2.staking.delegation.error.subtitle',
};

const stateIdle = delegationFlowMachine.initialState;

const stateCalculatingFees = execute(
  stateIdle,
  delegationFlowMachine.events.feeCalculationRequested({
    accountId: testAccountId,
    poolId: testPoolId,
  }),
) as StateWithStatusOf<'CalculatingFees'>;

const stateSummary = execute(
  stateCalculatingFees,
  delegationFlowMachine.events.feeCalculationCompleted({
    deposit: testDeposit,
    fees: testFees,
    serializedTx: testSerializedTx,
    wallet: testWallet,
  }),
) as StateWithStatusOf<'Summary'>;

const stateAwaitingConfirmation = execute(
  stateSummary,
  delegationFlowMachine.events.delegationRequested(),
) as StateWithStatusOf<'AwaitingConfirmation'>;

const stateProcessing = execute(
  stateAwaitingConfirmation,
  delegationFlowMachine.events.confirmationCompleted({
    result: { success: true, serializedTx: testSerializedTx },
  }),
) as StateWithStatusOf<'Processing'>;

const stateSuccess = execute(
  stateProcessing,
  delegationFlowMachine.events.processingResulted({
    result: { success: true, txId: testTxId },
  }),
) as StateWithStatusOf<'Success'>;

const stateError = execute(
  stateCalculatingFees,
  delegationFlowMachine.events.feeCalculationFailed({
    errorMessage: 'Test error',
    errorTranslationKeys: txErrorTranslationKeys,
  }),
) as StateWithStatusOf<'Error'>;

describe('delegationFlow stateMachine', () => {
  describe('Idle', () => {
    it('has correct initial state', () => {
      expect(stateIdle).toEqual({ status: 'Idle' });
    });

    it('switches to "CalculatingFees" on "feeCalculationRequested" event', () => {
      expect(stateCalculatingFees).toEqual({
        status: 'CalculatingFees',
        accountId: testAccountId,
        poolId: testPoolId,
      });
    });

    it('stays in "Idle" on "reset" event', () => {
      const state = execute(stateIdle, delegationFlowMachine.events.reset());
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('CalculatingFees', () => {
    it('switches to "Summary" on "feeCalculationCompleted" event', () => {
      expect(stateSummary).toEqual({
        status: 'Summary',
        accountId: testAccountId,
        poolId: testPoolId,
        confirmButtonEnabled: true,
        deposit: testDeposit,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Error" on "feeCalculationFailed" event', () => {
      expect(stateError).toEqual({
        status: 'Error',
        accountId: testAccountId,
        poolId: testPoolId,
        errorMessage: 'Test error',
        errorTranslationKeys: txErrorTranslationKeys,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateCalculatingFees,
        delegationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Summary', () => {
    it('switches to "AwaitingConfirmation" on "delegationRequested" event', () => {
      expect(stateAwaitingConfirmation.status).toBe('AwaitingConfirmation');
      expect(stateAwaitingConfirmation.confirmButtonEnabled).toBe(false);
    });

    it('preserves data when switching to "AwaitingConfirmation"', () => {
      expect(stateAwaitingConfirmation).toMatchObject({
        accountId: testAccountId,
        poolId: testPoolId,
        deposit: testDeposit,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(stateSummary, delegationFlowMachine.events.reset());
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('AwaitingConfirmation', () => {
    it('switches to "Processing" on successful "confirmationCompleted" event', () => {
      expect(stateProcessing.status).toBe('Processing');
    });

    it('preserves data when switching to "Processing"', () => {
      expect(stateProcessing).toMatchObject({
        accountId: testAccountId,
        poolId: testPoolId,
        deposit: testDeposit,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Error" on failed "confirmationCompleted" event', () => {
      const state = execute(
        stateAwaitingConfirmation,
        delegationFlowMachine.events.confirmationCompleted({
          result: {
            success: false,
            error: { name: 'ConfirmationError', message: 'User cancelled' },
            errorTranslationKeys: txErrorTranslationKeys,
          },
        }),
      ) as StateWithStatusOf<'Error'>;

      expect(state.status).toBe('Error');
      expect(state.errorMessage).toBe('User cancelled');
      expect(state.errorTranslationKeys).toEqual(txErrorTranslationKeys);
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateAwaitingConfirmation,
        delegationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Processing', () => {
    it('switches to "Success" on successful "processingResulted" event', () => {
      expect(stateSuccess.status).toBe('Success');
      expect(stateSuccess.txId).toBe(testTxId);
    });

    it('preserves relevant data when switching to "Success"', () => {
      expect(stateSuccess).toMatchObject({
        accountId: testAccountId,
        poolId: testPoolId,
        deposit: testDeposit,
        fees: testFees,
      });
    });

    it('switches to "Error" on failed "processingResulted" event', () => {
      const state = execute(
        stateProcessing,
        delegationFlowMachine.events.processingResulted({
          result: {
            success: false,
            error: { name: 'SubmitError', message: 'Network error' },
            errorTranslationKeys: txErrorTranslationKeys,
          },
        }),
      ) as StateWithStatusOf<'Error'>;

      expect(state.status).toBe('Error');
      expect(state.errorMessage).toBe('Network error');
    });

    it('stays in "Processing" on "reset" event', () => {
      const state = execute(
        stateProcessing,
        delegationFlowMachine.events.reset(),
      );
      expect(state.status).toBe('Processing');
    });
  });

  describe('Success', () => {
    it('switches to "Idle" on "reset" event', () => {
      const state = execute(stateSuccess, delegationFlowMachine.events.reset());
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Error', () => {
    it('switches to "CalculatingFees" on "retryRequested" event', () => {
      const state = execute(
        stateError,
        delegationFlowMachine.events.retryRequested({
          accountId: testAccountId,
          poolId: testPoolId,
        }),
      ) as StateWithStatusOf<'CalculatingFees'>;

      expect(state.status).toBe('CalculatingFees');
      expect(state.accountId).toBe(testAccountId);
      expect(state.poolId).toBe(testPoolId);
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(stateError, delegationFlowMachine.events.reset());
      expect(state).toEqual({ status: 'Idle' });
    });
  });
});

import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { deregistrationFlowMachine } from '../../src/store/deregistration-state-machine';

import {
  createDelegationErrorKeys,
  createMockWallet,
  createTestAccountId,
  createTestFees,
  TEST_DEPOSIT_RETURN,
  TEST_SERIALIZED_TX,
  TEST_TX_ID,
} from './test-utils';

import type { DeregistrationFlowState } from '../../src/store/deregistration-types';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<Status extends DeregistrationFlowState['status']> =
  DeregistrationFlowState & { status: Status };

const execute = makeStateMachineExecutor(deregistrationFlowMachine);

const testAccountId = createTestAccountId();
const testWallet = createMockWallet(testAccountId);
const testFees = createTestFees();
const testDepositReturn = TEST_DEPOSIT_RETURN;
const testSerializedTx = TEST_SERIALIZED_TX;
const testTxId = TEST_TX_ID;
const txErrorTranslationKeys: TxErrorTranslationKeys =
  createDelegationErrorKeys();

// Build states by executing events from initial state
const stateIdle = deregistrationFlowMachine.initialState;

const stateCalculatingFees = execute(
  stateIdle,
  deregistrationFlowMachine.events.feeCalculationRequested({
    accountId: testAccountId,
  }),
) as StateWithStatusOf<'CalculatingFees'>;

const stateSummary = execute(
  stateCalculatingFees,
  deregistrationFlowMachine.events.feeCalculationCompleted({
    depositReturn: testDepositReturn,
    fees: testFees,
    serializedTx: testSerializedTx,
    wallet: testWallet,
  }),
) as StateWithStatusOf<'Summary'>;

const stateAwaitingConfirmation = execute(
  stateSummary,
  deregistrationFlowMachine.events.deregistrationRequested(),
) as StateWithStatusOf<'AwaitingConfirmation'>;

const stateProcessing = execute(
  stateAwaitingConfirmation,
  deregistrationFlowMachine.events.confirmationCompleted({
    result: { success: true, serializedTx: testSerializedTx },
  }),
) as StateWithStatusOf<'Processing'>;

const stateSuccess = execute(
  stateProcessing,
  deregistrationFlowMachine.events.processingResulted({
    result: { success: true, txId: testTxId },
  }),
) as StateWithStatusOf<'Success'>;

const stateError = execute(
  stateCalculatingFees,
  deregistrationFlowMachine.events.feeCalculationFailed({
    errorMessage: 'Test error',
    errorTranslationKeys: txErrorTranslationKeys,
  }),
) as StateWithStatusOf<'Error'>;

describe('deregistrationFlow stateMachine', () => {
  describe('Idle', () => {
    it('has correct initial state', () => {
      expect(stateIdle).toEqual({ status: 'Idle' });
    });

    it('switches to "CalculatingFees" on "feeCalculationRequested" event', () => {
      expect(stateCalculatingFees).toEqual({
        status: 'CalculatingFees',
        accountId: testAccountId,
      });
    });

    it('stays in "Idle" on "reset" event', () => {
      const state = execute(
        stateIdle,
        deregistrationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('CalculatingFees', () => {
    it('switches to "Summary" on "feeCalculationCompleted" event', () => {
      expect(stateSummary).toEqual({
        status: 'Summary',
        accountId: testAccountId,
        confirmButtonEnabled: true,
        depositReturn: testDepositReturn,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Error" on "feeCalculationFailed" event', () => {
      expect(stateError).toEqual({
        status: 'Error',
        accountId: testAccountId,
        errorMessage: 'Test error',
        errorTranslationKeys: txErrorTranslationKeys,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateCalculatingFees,
        deregistrationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Summary', () => {
    it('switches to "AwaitingConfirmation" on "deregistrationRequested" event', () => {
      expect(stateAwaitingConfirmation.status).toBe('AwaitingConfirmation');
      expect(stateAwaitingConfirmation.confirmButtonEnabled).toBe(false);
    });

    it('preserves data when switching to "AwaitingConfirmation"', () => {
      expect(stateAwaitingConfirmation).toMatchObject({
        accountId: testAccountId,
        depositReturn: testDepositReturn,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateSummary,
        deregistrationFlowMachine.events.reset(),
      );
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
        depositReturn: testDepositReturn,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Error" on failed "confirmationCompleted" event', () => {
      const state = execute(
        stateAwaitingConfirmation,
        deregistrationFlowMachine.events.confirmationCompleted({
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
        deregistrationFlowMachine.events.reset(),
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
        depositReturn: testDepositReturn,
        fees: testFees,
      });
    });

    it('switches to "Error" on failed "processingResulted" event', () => {
      const state = execute(
        stateProcessing,
        deregistrationFlowMachine.events.processingResulted({
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
        deregistrationFlowMachine.events.reset(),
      );
      expect(state.status).toBe('Processing');
    });
  });

  describe('Success', () => {
    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateSuccess,
        deregistrationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Error', () => {
    it('switches to "CalculatingFees" on "retryRequested" event', () => {
      const state = execute(
        stateError,
        deregistrationFlowMachine.events.retryRequested({
          accountId: testAccountId,
        }),
      ) as StateWithStatusOf<'CalculatingFees'>;

      expect(state.status).toBe('CalculatingFees');
      expect(state.accountId).toBe(testAccountId);
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateError,
        deregistrationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });
});

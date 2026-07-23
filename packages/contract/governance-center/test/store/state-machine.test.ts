import { Cardano } from '@cardano-sdk/core';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { voteDelegationFlowMachine } from '../../src/store/state-machine';

import type { VoteDelegationFlowState } from '../../src/store/types';
import type { DRepOption } from '@lace-contract/cardano-context';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<Status extends VoteDelegationFlowState['status']> =
  VoteDelegationFlowState & { status: Status };

const execute = makeStateMachineExecutor(voteDelegationFlowMachine);

const testAccountId = 'test-account' as AccountId;
const testDRep: DRepOption = { type: 'alwaysAbstain' };
const testDRepSpecific: DRepOption = {
  type: 'specific',
  drepId: Cardano.DRepID(
    'drep1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqua9udh',
  ),
};
const testWallet = { accounts: [] } as unknown as AnyWallet;
const testFees = [{ amount: BigNumber(200000n), tokenId: LOVELACE_TOKEN_ID }];
const testDeposit = '2000000';
const testSerializedTx = 'a100818258...';
const testTxId = 'txId123';
const txErrorTranslationKeys: TxErrorTranslationKeys = {
  title: 'v2.governance.delegation.error.title',
  subtitle: 'v2.governance.delegation.error.subtitle',
};

const stateIdle = voteDelegationFlowMachine.initialState;

const stateCalculatingFees = execute(
  stateIdle,
  voteDelegationFlowMachine.events.feeCalculationRequested({
    accountId: testAccountId,
    dRep: testDRep,
  }),
) as StateWithStatusOf<'CalculatingFees'>;

const stateSummary = execute(
  stateCalculatingFees,
  voteDelegationFlowMachine.events.feeCalculationCompleted({
    deposit: testDeposit,
    fees: testFees,
    serializedTx: testSerializedTx,
    wallet: testWallet,
  }),
) as StateWithStatusOf<'Summary'>;

const stateAwaitingConfirmation = execute(
  stateSummary,
  voteDelegationFlowMachine.events.delegationRequested(),
) as StateWithStatusOf<'AwaitingConfirmation'>;

const stateProcessing = execute(
  stateAwaitingConfirmation,
  voteDelegationFlowMachine.events.confirmationCompleted({
    result: { success: true, serializedTx: testSerializedTx },
  }),
) as StateWithStatusOf<'Processing'>;

const stateSuccess = execute(
  stateProcessing,
  voteDelegationFlowMachine.events.processingResulted({
    result: { success: true, txId: testTxId },
  }),
) as StateWithStatusOf<'Success'>;

const stateError = execute(
  stateCalculatingFees,
  voteDelegationFlowMachine.events.feeCalculationFailed({
    errorMessage: 'Test error',
    errorTranslationKeys: txErrorTranslationKeys,
  }),
) as StateWithStatusOf<'Error'>;

describe('voteDelegationFlow stateMachine', () => {
  describe('Idle', () => {
    it('has correct initial state', () => {
      expect(stateIdle).toEqual({ status: 'Idle' });
    });

    it('switches to "CalculatingFees" on "feeCalculationRequested" event', () => {
      expect(stateCalculatingFees).toEqual({
        status: 'CalculatingFees',
        accountId: testAccountId,
        dRep: testDRep,
      });
    });

    it('accepts specific DRep in "feeCalculationRequested"', () => {
      const state = execute(
        stateIdle,
        voteDelegationFlowMachine.events.feeCalculationRequested({
          accountId: testAccountId,
          dRep: testDRepSpecific,
        }),
      ) as StateWithStatusOf<'CalculatingFees'>;
      expect(state.dRep).toEqual(testDRepSpecific);
    });

    it('stays in "Idle" on "reset" event', () => {
      const state = execute(
        stateIdle,
        voteDelegationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('CalculatingFees', () => {
    it('switches to "Summary" on "feeCalculationCompleted" event', () => {
      expect(stateSummary).toEqual({
        status: 'Summary',
        accountId: testAccountId,
        dRep: testDRep,
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
        dRep: testDRep,
        errorMessage: 'Test error',
        errorTranslationKeys: txErrorTranslationKeys,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateCalculatingFees,
        voteDelegationFlowMachine.events.reset(),
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
        dRep: testDRep,
        deposit: testDeposit,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateSummary,
        voteDelegationFlowMachine.events.reset(),
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
        dRep: testDRep,
        deposit: testDeposit,
        fees: testFees,
        serializedTx: testSerializedTx,
        wallet: testWallet,
      });
    });

    it('switches to "Error" on failed "confirmationCompleted" event', () => {
      const state = execute(
        stateAwaitingConfirmation,
        voteDelegationFlowMachine.events.confirmationCompleted({
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
        voteDelegationFlowMachine.events.reset(),
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
        dRep: testDRep,
        deposit: testDeposit,
        fees: testFees,
      });
    });

    it('switches to "Error" on failed "processingResulted" event', () => {
      const state = execute(
        stateProcessing,
        voteDelegationFlowMachine.events.processingResulted({
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
        voteDelegationFlowMachine.events.reset(),
      );
      expect(state.status).toBe('Processing');
    });
  });

  describe('Success', () => {
    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateSuccess,
        voteDelegationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Error', () => {
    it('switches to "CalculatingFees" on "retryRequested" event', () => {
      const state = execute(
        stateError,
        voteDelegationFlowMachine.events.retryRequested({
          accountId: testAccountId,
          dRep: testDRep,
        }),
      ) as StateWithStatusOf<'CalculatingFees'>;

      expect(state.status).toBe('CalculatingFees');
      expect(state.accountId).toBe(testAccountId);
      expect(state.dRep).toEqual(testDRep);
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateError,
        voteDelegationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });
});

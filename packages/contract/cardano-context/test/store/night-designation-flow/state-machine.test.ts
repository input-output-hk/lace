import { BigNumber } from '@lace-lib/util';
import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { LOVELACE_TOKEN_ID } from '../../../src/const';
import { nightDesignationFlowMachine } from '../../../src/store/night-designation-flow/state-machine';

import type { NightDesignationFlowSliceState } from '../../../src/store/night-designation-flow/types';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<
  Status extends NightDesignationFlowSliceState['status'],
> = NightDesignationFlowSliceState & { status: Status };

const execute = makeStateMachineExecutor(nightDesignationFlowMachine);

const testAccountId = 'test-account' as AccountId;
const testFees = [{ amount: BigNumber(200_000n), tokenId: LOVELACE_TOKEN_ID }];
const testSerializedTx = 'a100818258...';
const testSignedTx = 'b200818258...';
const testTxId = 'txId123';
const txErrorTranslationKeys: TxErrorTranslationKeys = {
  title: 'v2.staking.delegation.error.title',
  subtitle: 'v2.staking.delegation.error.subtitle',
};

const stateIdle = nightDesignationFlowMachine.initialState;

const stateBuilding = execute(
  stateIdle,
  nightDesignationFlowMachine.events.designationRequested({
    accountId: testAccountId,
    action: 'designate',
  }),
) as StateWithStatusOf<'Building'>;

const stateAwaitingConfirmation = execute(
  stateBuilding,
  nightDesignationFlowMachine.events.buildCompleted({
    result: { success: true, serializedTx: testSerializedTx, fees: testFees },
  }),
) as StateWithStatusOf<'AwaitingConfirmation'>;

const stateProcessing = execute(
  stateAwaitingConfirmation,
  nightDesignationFlowMachine.events.confirmationCompleted({
    result: { success: true, serializedTx: testSignedTx },
  }),
) as StateWithStatusOf<'Processing'>;

const stateSuccess = execute(
  stateProcessing,
  nightDesignationFlowMachine.events.processingResulted({
    result: { success: true, txId: testTxId },
  }),
) as StateWithStatusOf<'Success'>;

const stateErrorFromConfirmation = execute(
  stateAwaitingConfirmation,
  nightDesignationFlowMachine.events.confirmationCompleted({
    result: {
      success: false,
      error: { name: 'ConfirmationError', message: 'User cancelled' },
      errorTranslationKeys: txErrorTranslationKeys,
    },
  }),
) as StateWithStatusOf<'Error'>;

describe('nightDesignationFlow stateMachine', () => {
  describe('Idle', () => {
    it('has correct initial state', () => {
      expect(stateIdle).toEqual({ status: 'Idle' });
    });

    it.each(['designate', 'update', 'deregister'] as const)(
      'switches to "Building" on "designationRequested" with action=%s',
      action => {
        const state = execute(
          stateIdle,
          nightDesignationFlowMachine.events.designationRequested({
            accountId: testAccountId,
            action,
          }),
        );
        expect(state).toEqual({
          status: 'Building',
          accountId: testAccountId,
          action,
        });
      },
    );

    it('threads dustPubkeyHex when supplied on "designationRequested"', () => {
      const dustPubkeyHex = 'a'.repeat(64);
      const state = execute(
        stateIdle,
        nightDesignationFlowMachine.events.designationRequested({
          accountId: testAccountId,
          action: 'designate',
          dustPubkeyHex,
        }),
      );
      expect(state).toEqual({
        status: 'Building',
        accountId: testAccountId,
        action: 'designate',
        dustPubkeyHex,
      });
    });

    it('carries scriptWithdrawableLovelace (a serializable string) for update', () => {
      const state = execute(
        stateIdle,
        nightDesignationFlowMachine.events.designationRequested({
          accountId: testAccountId,
          action: 'update',
          dustPubkeyHex: 'c'.repeat(64),
          scriptWithdrawableLovelace: '1500000',
        }),
      );
      expect(state).toMatchObject({
        status: 'Building',
        scriptWithdrawableLovelace: '1500000',
      });
      // Must be a plain string — no BigInt enters serializable-checked state.
      expect(
        typeof (state as { scriptWithdrawableLovelace?: unknown })
          .scriptWithdrawableLovelace,
      ).toBe('string');
    });

    it('keeps the "designationRequested" payload JSON-serializable', () => {
      const payload = {
        accountId: testAccountId,
        action: 'update' as const,
        dustPubkeyHex: 'd'.repeat(64),
        scriptWithdrawableLovelace: '1500000',
      };
      // The slice is run through redux serializableCheck; the request
      // payload must not carry non-serializable values (BigInt, Utxo, …).
      expect(() => JSON.stringify(payload)).not.toThrow();
      expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    });

    it('tolerates a late "buildCompleted" (post-reset race) as a no-op', () => {
      const state = execute(
        stateIdle,
        nightDesignationFlowMachine.events.buildCompleted({
          result: {
            success: true,
            serializedTx: testSerializedTx,
            fees: testFees,
          },
        }),
      );
      expect(state).toEqual({ status: 'Idle' });
    });

    it('stays in "Idle" on "reset" event', () => {
      const state = execute(
        stateIdle,
        nightDesignationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Building', () => {
    it('preserves accountId / action from "designationRequested"', () => {
      expect(stateBuilding).toEqual({
        status: 'Building',
        accountId: testAccountId,
        action: 'designate',
      });
    });

    it('switches to "AwaitingConfirmation" on successful "buildCompleted"', () => {
      expect(stateAwaitingConfirmation).toEqual({
        status: 'AwaitingConfirmation',
        accountId: testAccountId,
        action: 'designate',
        fees: testFees,
        serializedTx: testSerializedTx,
      });
    });

    it('switches to "Error" on failed "buildCompleted"', () => {
      const state = execute(
        stateBuilding,
        nightDesignationFlowMachine.events.buildCompleted({
          result: {
            success: false,
            error: { name: 'BuildError', message: 'No cNIGHT in this account' },
            errorTranslationKeys: txErrorTranslationKeys,
          },
        }),
      ) as StateWithStatusOf<'Error'>;
      expect(state).toEqual({
        status: 'Error',
        accountId: testAccountId,
        action: 'designate',
        error: { name: 'BuildError', message: 'No cNIGHT in this account' },
        errorTranslationKeys: txErrorTranslationKeys,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateBuilding,
        nightDesignationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('AwaitingConfirmation', () => {
    it('switches to "Processing" on successful "confirmationCompleted"', () => {
      expect(stateProcessing.status).toBe('Processing');
    });

    it('swaps in the signed CBOR from the confirmation result', () => {
      expect(stateProcessing.serializedTx).toBe(testSignedTx);
    });

    it('preserves accountId / action / fees when switching to "Processing"', () => {
      expect(stateProcessing).toMatchObject({
        accountId: testAccountId,
        action: 'designate',
        fees: testFees,
      });
    });

    it('switches to "Error" on failed "confirmationCompleted"', () => {
      expect(stateErrorFromConfirmation).toEqual({
        status: 'Error',
        accountId: testAccountId,
        action: 'designate',
        error: { name: 'ConfirmationError', message: 'User cancelled' },
        errorTranslationKeys: txErrorTranslationKeys,
      });
    });

    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateAwaitingConfirmation,
        nightDesignationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });

  describe('Processing', () => {
    it('switches to "Success" on successful "processingResulted"', () => {
      expect(stateSuccess.status).toBe('Success');
      expect(stateSuccess.txId).toBe(testTxId);
    });

    it('preserves accountId / action / fees when switching to "Success"', () => {
      expect(stateSuccess).toMatchObject({
        accountId: testAccountId,
        action: 'designate',
        fees: testFees,
      });
    });

    it('switches to "Error" on failed "processingResulted"', () => {
      const state = execute(
        stateProcessing,
        nightDesignationFlowMachine.events.processingResulted({
          result: {
            success: false,
            error: { name: 'SubmitError', message: 'Network error' },
            errorTranslationKeys: txErrorTranslationKeys,
          },
        }),
      ) as StateWithStatusOf<'Error'>;

      expect(state.status).toBe('Error');
      expect(state.error).toEqual({
        name: 'SubmitError',
        message: 'Network error',
      });
      expect(state.errorTranslationKeys).toEqual(txErrorTranslationKeys);
    });

    it('stays in "Processing" on "reset" event (in-flight tx)', () => {
      const state = execute(
        stateProcessing,
        nightDesignationFlowMachine.events.reset(),
      );
      expect(state.status).toBe('Processing');
    });
  });

  describe('Success', () => {
    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateSuccess,
        nightDesignationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });

    it('threads dustPubkeyHex through Idle → Building → AwaitingConfirmation → Processing → Success', () => {
      const dustPubkeyHex = 'b'.repeat(64);
      const building = execute(
        stateIdle,
        nightDesignationFlowMachine.events.designationRequested({
          accountId: testAccountId,
          action: 'update',
          dustPubkeyHex,
        }),
      ) as StateWithStatusOf<'Building'>;
      const awaiting = execute(
        building,
        nightDesignationFlowMachine.events.buildCompleted({
          result: {
            success: true,
            serializedTx: testSerializedTx,
            fees: testFees,
          },
        }),
      ) as StateWithStatusOf<'AwaitingConfirmation'>;
      const processing = execute(
        awaiting,
        nightDesignationFlowMachine.events.confirmationCompleted({
          result: { success: true, serializedTx: testSignedTx },
        }),
      ) as StateWithStatusOf<'Processing'>;
      const success = execute(
        processing,
        nightDesignationFlowMachine.events.processingResulted({
          result: { success: true, txId: testTxId },
        }),
      ) as StateWithStatusOf<'Success'>;
      expect(building.dustPubkeyHex).toBe(dustPubkeyHex);
      expect(awaiting.dustPubkeyHex).toBe(dustPubkeyHex);
      expect(processing.dustPubkeyHex).toBe(dustPubkeyHex);
      expect(success.dustPubkeyHex).toBe(dustPubkeyHex);
    });
  });

  describe('Error', () => {
    it('switches to "Idle" on "reset" event', () => {
      const state = execute(
        stateErrorFromConfirmation,
        nightDesignationFlowMachine.events.reset(),
      );
      expect(state).toEqual({ status: 'Idle' });
    });
  });
});

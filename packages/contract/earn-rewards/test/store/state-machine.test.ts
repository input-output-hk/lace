import { Cardano } from '@cardano-sdk/core';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { earnRewardsFlowMachine } from '../../src/store/state-machine';

import type { EarnRewardsFlowState } from '../../src/store/types';
import type { DRepOption } from '@lace-contract/cardano-context';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<Status extends EarnRewardsFlowState['status']> =
  EarnRewardsFlowState & { status: Status };

const execute = makeStateMachineExecutor(earnRewardsFlowMachine);

const testAccountId = 'test-account' as AccountId;
const testPoolId = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);
const testDRep: DRepOption = {
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
  title: 'v2.earn-rewards.error.title',
  subtitle: 'v2.earn-rewards.error.subtitle',
};

const stateIdle = earnRewardsFlowMachine.initialState;

const stateCalculatingFees = execute(
  stateIdle,
  earnRewardsFlowMachine.events.feeCalculationRequested({
    accountId: testAccountId,
    poolId: testPoolId,
    dRep: testDRep,
  }),
) as StateWithStatusOf<'CalculatingFees'>;

const stateSummary = execute(
  stateCalculatingFees,
  earnRewardsFlowMachine.events.feeCalculationCompleted({
    deposit: testDeposit,
    fees: testFees,
    serializedTx: testSerializedTx,
    wallet: testWallet,
  }),
) as StateWithStatusOf<'Summary'>;

const stateAwaitingConfirmation = execute(
  stateSummary,
  earnRewardsFlowMachine.events.earnRewardsRequested(),
) as StateWithStatusOf<'AwaitingConfirmation'>;

const stateProcessing = execute(
  stateAwaitingConfirmation,
  earnRewardsFlowMachine.events.confirmationCompleted({
    result: { success: true, serializedTx: testSerializedTx },
  }),
) as StateWithStatusOf<'Processing'>;

const stateSuccess = execute(
  stateProcessing,
  earnRewardsFlowMachine.events.processingResulted({
    result: { success: true, txId: testTxId },
  }),
) as StateWithStatusOf<'Success'>;

const stateError = execute(
  stateCalculatingFees,
  earnRewardsFlowMachine.events.feeCalculationFailed({
    errorMessage: 'Test error',
    errorTranslationKeys: txErrorTranslationKeys,
  }),
) as StateWithStatusOf<'Error'>;

describe('earnRewardsFlow stateMachine', () => {
  it('has the Idle initial state', () => {
    expect(stateIdle).toEqual({ status: 'Idle' });
  });

  it('Idle → CalculatingFees on feeCalculationRequested, carrying pool + dRep', () => {
    expect(stateCalculatingFees).toEqual({
      status: 'CalculatingFees',
      accountId: testAccountId,
      poolId: testPoolId,
      dRep: testDRep,
    });
  });

  it('CalculatingFees → Summary on feeCalculationCompleted', () => {
    expect(stateSummary).toEqual({
      status: 'Summary',
      accountId: testAccountId,
      deposit: testDeposit,
      fees: testFees,
      poolId: testPoolId,
      dRep: testDRep,
      serializedTx: testSerializedTx,
      wallet: testWallet,
    });
  });

  it('CalculatingFees → Error on feeCalculationFailed', () => {
    expect(stateError).toEqual({
      status: 'Error',
      accountId: testAccountId,
      poolId: testPoolId,
      dRep: testDRep,
      phase: 'fee-calculation',
      errorMessage: 'Test error',
      errorTranslationKeys: txErrorTranslationKeys,
    });
  });

  it('Summary → AwaitingConfirmation on earnRewardsRequested', () => {
    expect(stateAwaitingConfirmation.status).toBe('AwaitingConfirmation');
    expect(stateAwaitingConfirmation.dRep).toEqual(testDRep);
  });

  it('Summary ignores stale feeCalculationCompleted / feeCalculationFailed', () => {
    expect(
      execute(
        stateSummary,
        earnRewardsFlowMachine.events.feeCalculationCompleted({
          deposit: '999',
          fees: testFees,
          serializedTx: 'stale',
          wallet: testWallet,
        }),
      ),
    ).toEqual(stateSummary);
    expect(
      execute(
        stateSummary,
        earnRewardsFlowMachine.events.feeCalculationFailed({
          errorMessage: 'stale',
          errorTranslationKeys: txErrorTranslationKeys,
        }),
      ),
    ).toEqual(stateSummary);
  });

  it('AwaitingConfirmation → Processing on successful confirmation', () => {
    expect(stateProcessing).toEqual({
      status: 'Processing',
      accountId: testAccountId,
      deposit: testDeposit,
      fees: testFees,
      poolId: testPoolId,
      dRep: testDRep,
      serializedTx: testSerializedTx,
      wallet: testWallet,
    });
  });

  it('AwaitingConfirmation → Error on failed confirmation', () => {
    const errored = execute(
      stateAwaitingConfirmation,
      earnRewardsFlowMachine.events.confirmationCompleted({
        result: {
          success: false,
          error: { name: 'Error', message: 'declined' },
          errorTranslationKeys: txErrorTranslationKeys,
        },
      }),
    );
    expect(errored).toMatchObject({ status: 'Error', phase: 'signing' });
  });

  it('Processing → Success on successful submission (carries txId)', () => {
    expect(stateSuccess).toEqual({
      status: 'Success',
      accountId: testAccountId,
      deposit: testDeposit,
      fees: testFees,
      poolId: testPoolId,
      dRep: testDRep,
      txId: testTxId,
    });
  });

  it('Processing → Error on failed submission', () => {
    const errored = execute(
      stateProcessing,
      earnRewardsFlowMachine.events.processingResulted({
        result: {
          success: false,
          error: { name: 'Error', message: 'submit failed' },
          errorTranslationKeys: txErrorTranslationKeys,
        },
      }),
    );
    expect(errored).toMatchObject({ status: 'Error', phase: 'submission' });
  });

  it('Processing cannot be cancelled by reset (mid-submit)', () => {
    expect(
      execute(stateProcessing, earnRewardsFlowMachine.events.reset()),
    ).toEqual(stateProcessing);
  });

  it('Error → CalculatingFees on retryRequested', () => {
    expect(
      execute(
        stateError,
        earnRewardsFlowMachine.events.retryRequested({
          accountId: testAccountId,
          poolId: testPoolId,
          dRep: testDRep,
        }),
      ),
    ).toEqual({
      status: 'CalculatingFees',
      accountId: testAccountId,
      poolId: testPoolId,
      dRep: testDRep,
    });
  });

  it('Success → Idle on reset', () => {
    expect(
      execute(stateSuccess, earnRewardsFlowMachine.events.reset()),
    ).toEqual(stateIdle);
  });

  it('Error ignores stale feeCalculationCompleted / feeCalculationFailed', () => {
    expect(
      execute(
        stateError,
        earnRewardsFlowMachine.events.feeCalculationCompleted({
          deposit: '999',
          fees: testFees,
          serializedTx: 'stale',
          wallet: testWallet,
        }),
      ),
    ).toEqual(stateError);
    expect(
      execute(
        stateError,
        earnRewardsFlowMachine.events.feeCalculationFailed({
          errorMessage: 'stale',
          errorTranslationKeys: txErrorTranslationKeys,
        }),
      ),
    ).toEqual(stateError);
  });

  it.each<[string, EarnRewardsFlowState]>([
    ['Idle', stateIdle],
    ['CalculatingFees', stateCalculatingFees],
    ['Summary', stateSummary],
    ['AwaitingConfirmation', stateAwaitingConfirmation],
    ['Error', stateError],
  ])('reset from %s returns to Idle', (_label, state) => {
    expect(execute(state, earnRewardsFlowMachine.events.reset())).toEqual(
      stateIdle,
    );
  });
});

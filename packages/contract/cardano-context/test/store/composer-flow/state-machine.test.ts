import { BigNumber } from '@lace-lib/util';
import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { LOVELACE_TOKEN_ID } from '../../../src/const';
import { composerFlowMachine } from '../../../src/store/composer-flow/state-machine';

import type {
  ComposerFlowSliceState,
  ComposerRequest,
} from '../../../src/store/composer-flow/types';
import type { CardanoPaymentAddress } from '../../../src/types';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<Status extends ComposerFlowSliceState['status']> =
  ComposerFlowSliceState & { status: Status };

const execute = makeStateMachineExecutor(composerFlowMachine);

const testAccountId = 'test-account' as AccountId;
const testFees = [{ amount: BigNumber(200_000n), tokenId: LOVELACE_TOKEN_ID }];
const testSerializedTx = 'a100818258...';
const testSignedTx = 'b200818258...';
const testTxId = 'txId123';
const testRequest: ComposerRequest = {
  outputs: [
    {
      address: 'addr_test1recipient' as unknown as CardanoPaymentAddress,
      lovelace: '2000000',
    },
  ],
};
const errorTranslationKeys: TxErrorTranslationKeys = {
  title: 'v2.composer.build.error.title',
  subtitle: 'v2.composer.build.error.subtitle',
};

const stateIdle = composerFlowMachine.initialState;

const stateBuilding = execute(
  stateIdle,
  composerFlowMachine.events.composeRequested({
    accountId: testAccountId,
    request: testRequest,
  }),
) as StateWithStatusOf<'Building'>;

const stateAwaitingConfirmation = execute(
  stateBuilding,
  composerFlowMachine.events.buildCompleted({
    accountId: testAccountId,
    result: {
      success: true,
      serializedTx: testSerializedTx,
      fees: testFees,
      txId: testTxId,
    },
  }),
) as StateWithStatusOf<'AwaitingConfirmation'>;

const stateProcessing = execute(
  stateAwaitingConfirmation,
  composerFlowMachine.events.confirmationCompleted({
    result: { success: true, serializedTx: testSignedTx },
  }),
) as StateWithStatusOf<'Processing'>;

const stateSuccess = execute(
  stateProcessing,
  composerFlowMachine.events.processingResulted({
    result: { success: true, txId: testTxId },
  }),
) as StateWithStatusOf<'Success'>;

describe('composerFlowMachine', () => {
  it('starts Idle', () => {
    expect(stateIdle).toEqual({ status: 'Idle' });
  });

  describe('Idle', () => {
    it('moves to Building carrying the account and the request', () => {
      expect(stateBuilding).toEqual({
        status: 'Building',
        accountId: testAccountId,
        request: testRequest,
      });
    });

    it('ignores a buildCompleted that lands after a reset', () => {
      expect(
        execute(
          stateIdle,
          composerFlowMachine.events.buildCompleted({
            accountId: testAccountId,
            result: {
              success: true,
              serializedTx: testSerializedTx,
              fees: testFees,
              txId: testTxId,
            },
          }),
        ),
      ).toEqual(stateIdle);
    });

    it('drops a confirmation the user approved after a reset', () => {
      expect(
        execute(
          stateIdle,
          composerFlowMachine.events.confirmationCompleted({
            result: { success: true, serializedTx: testSignedTx },
          }),
        ),
      ).toEqual(stateIdle);
    });

    it('stays Idle on reset', () => {
      expect(execute(stateIdle, composerFlowMachine.events.reset())).toEqual(
        stateIdle,
      );
    });
  });

  describe('Building', () => {
    it('moves to AwaitingConfirmation with the built tx, fee and id', () => {
      expect(stateAwaitingConfirmation).toEqual({
        status: 'AwaitingConfirmation',
        accountId: testAccountId,
        request: testRequest,
        fees: testFees,
        serializedTx: testSerializedTx,
        txId: testTxId,
      });
    });

    it('moves to Error when the build fails', () => {
      expect(
        execute(
          stateBuilding,
          composerFlowMachine.events.buildCompleted({
            accountId: testAccountId,
            result: {
              success: false,
              error: { name: 'BuildError', message: 'no utxos' },
              errorTranslationKeys,
            },
          }),
        ),
      ).toEqual({
        status: 'Error',
        accountId: testAccountId,
        error: { name: 'BuildError', message: 'no utxos' },
        errorTranslationKeys,
      });
    });

    it('ignores a buildCompleted reporting another account', () => {
      expect(
        execute(
          stateBuilding,
          composerFlowMachine.events.buildCompleted({
            accountId: 'other-account' as AccountId,
            result: {
              success: true,
              serializedTx: 'c300818258...',
              fees: testFees,
              txId: 'txId456',
            },
          }),
        ),
      ).toEqual(stateBuilding);
    });

    it('returns to Idle on reset', () => {
      expect(
        execute(stateBuilding, composerFlowMachine.events.reset()),
      ).toEqual(stateIdle);
    });
  });

  describe('AwaitingConfirmation', () => {
    it('moves to Processing with the signed tx, keeping the build-time id', () => {
      expect(stateProcessing).toEqual({
        status: 'Processing',
        accountId: testAccountId,
        request: testRequest,
        fees: testFees,
        serializedTx: testSignedTx,
        txId: testTxId,
      });
    });

    it('moves to Error when confirmation fails', () => {
      expect(
        execute(
          stateAwaitingConfirmation,
          composerFlowMachine.events.confirmationCompleted({
            result: {
              success: false,
              error: { name: 'ConfirmationError', message: 'User cancelled' },
              errorTranslationKeys,
            },
          }),
        ),
      ).toEqual({
        status: 'Error',
        accountId: testAccountId,
        error: { name: 'ConfirmationError', message: 'User cancelled' },
        errorTranslationKeys,
      });
    });

    it('returns to Idle on reset', () => {
      expect(
        execute(stateAwaitingConfirmation, composerFlowMachine.events.reset()),
      ).toEqual(stateIdle);
    });
  });

  describe('Processing', () => {
    it('moves to Success with the submitted tx id', () => {
      expect(stateSuccess).toEqual({
        status: 'Success',
        accountId: testAccountId,
        fees: testFees,
        txId: testTxId,
      });
    });

    it('moves to Error when submission fails', () => {
      expect(
        execute(
          stateProcessing,
          composerFlowMachine.events.processingResulted({
            result: {
              success: false,
              error: { name: 'SubmissionError', message: 'rejected' },
              errorTranslationKeys,
            },
          }),
        ),
      ).toEqual({
        status: 'Error',
        accountId: testAccountId,
        error: { name: 'SubmissionError', message: 'rejected' },
        errorTranslationKeys,
      });
    });

    it('keeps an in-flight submission on reset', () => {
      expect(
        execute(stateProcessing, composerFlowMachine.events.reset()),
      ).toEqual(stateProcessing);
    });
  });

  describe('terminal states', () => {
    it('returns to Idle from Success on reset', () => {
      expect(execute(stateSuccess, composerFlowMachine.events.reset())).toEqual(
        stateIdle,
      );
    });

    it('returns to Idle from Error on reset', () => {
      const stateError = execute(
        stateProcessing,
        composerFlowMachine.events.processingResulted({
          result: { success: false, errorTranslationKeys },
        }),
      ) as StateWithStatusOf<'Error'>;

      expect(execute(stateError, composerFlowMachine.events.reset())).toEqual(
        stateIdle,
      );
    });
  });
});

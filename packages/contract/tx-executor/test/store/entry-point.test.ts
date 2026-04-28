import { createTestScheduler } from '@cardano-sdk/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { makeEntryPoint } from '../../src/store/entry-point';
import { txExecutorActions } from '../../src/store/slice';

import type {
  TxSubmissionResult,
  TxExecutorImplementationMethodName,
} from '../../src/types';

// Define concrete types for test parameters
interface TestParams {
  id: string;
}
const params: TestParams = { id: 'params' };
const entryPointType = 'test';

const testEntryPoint = makeEntryPoint<
  TxExecutorImplementationMethodName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any, // Use any for the mapResult return type generic
  TxSubmissionResult
>(entryPointType as TxExecutorImplementationMethodName);

const executionId = 'executionId';

vi.mock('uuid', () => ({ v4: () => executionId }));

describe('tx-executor entry point', () => {
  it('emits "txPhaseRequested" action', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      expectObservable(
        testEntryPoint({
          txPhaseCompleted$: cold(''),
          txPhaseRequested$: cold(''),
        })(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
          params as any,
          (result: unknown) => result as TxSubmissionResult,
        ),
      ).toBe('a', {
        a: txExecutorActions.txExecutor.txPhaseRequested({
          executionId,
          config: {
            type: entryPointType as TxExecutorImplementationMethodName,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            params: params as any,
          },
        }),
      });
    });
  });

  it('maps "txPhaseCompleted" action and emits result', () => {
    createTestScheduler().run(({ cold, expectObservable, flush }) => {
      const mappedResult = 'mappedResult';
      // Ensure mapResultMock expects unknown and returns any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapResultMock = vi.fn((result: unknown): any => {
        expect(result).toEqual(receivedResult);
        return mappedResult;
      });
      const receivedResult = {
        success: true as const,
        txId: 'txId',
      };

      const completedAction = txExecutorActions.txExecutor.txPhaseCompleted({
        executionId,
        result: receivedResult,
      });

      expectObservable(
        testEntryPoint({
          txPhaseCompleted$: cold('-a', { a: completedAction }),
          txPhaseRequested$: cold(''),
        })(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
          params as any,
          mapResultMock,
        ),
      ).toBe('a(b|)', {
        // Disable unsafe assignment for expect.any
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        a: expect.any(Object),
        b: mappedResult,
      });

      flush();

      expect(mapResultMock).toHaveBeenCalledWith(receivedResult);
    });
  });

  it('ignores "txSubmitCompleted" actions with a different executionId', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const completedAction = txExecutorActions.txExecutor.txPhaseCompleted({
        executionId: 'differentExecutionId',
        result: {
          success: true as const,
          txId: 'txId',
        },
      });

      expectObservable(
        testEntryPoint({
          txPhaseCompleted$: cold('-a', { a: completedAction }),
          txPhaseRequested$: cold(''),
        })(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
          params as any,
          (result: unknown) => result as TxSubmissionResult,
        ),
      ).toBe('a-', {
        a: expect.any(Object) as unknown,
      });
    });
  });
});

import { midnightContextActions } from '@lace-contract/midnight-context';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import {
  clearTeeAttestationProgressOnNewTx,
  watchTeeAttestationProgress,
} from '../../../src/store/side-effects/tee-attestation-progress';

import type { AttestationProgressEvent } from '@lace-contract/midnight-context';

const actions = { ...midnightContextActions };

// The action creator is not exported from the tx-executor package root
// (side effects consume the pre-filtered observable), so the test builds
// payload-shaped values directly.
const txPhaseRequested = (blockchainName: string, type: string) => ({
  type: 'txExecutor/tx-phase-requested',
  payload: {
    config: { type, params: { blockchainName } },
    executionId: 'execution-1',
  },
});

describe('watchTeeAttestationProgress', () => {
  it('maps every progress emission to teeAttestationProgressUpdated', () => {
    const reset: AttestationProgressEvent = {
      type: 'reset',
      steps: ['obtain-evidence', 'proving'],
    };
    const started: AttestationProgressEvent = {
      type: 'phase',
      phase: 'obtain-evidence',
      status: 'started',
    };
    const failed: AttestationProgressEvent = {
      type: 'phase',
      phase: 'warden-verify',
      status: 'failed',
    };

    const wrap = (event: AttestationProgressEvent) => ({
      type: 'progress' as const,
      operationId: 'send-1',
      event,
    });
    testSideEffect(
      watchTeeAttestationProgress,
      ({ hot, expectObservable }) => ({
        dependencies: {
          actions,
          teeAttestationProgress$: hot('a-b--c', {
            a: wrap(reset),
            b: wrap(started),
            c: wrap(failed),
          }),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a-b--c', {
            a: actions.midnightContext.teeAttestationProgressUpdated(
              wrap(reset),
            ),
            b: actions.midnightContext.teeAttestationProgressUpdated(
              wrap(started),
            ),
            c: actions.midnightContext.teeAttestationProgressUpdated(
              wrap(failed),
            ),
          });
        },
      }),
    );
  });
});

describe('clearTeeAttestationProgressOnNewTx', () => {
  it('clears on Midnight buildTx; the signer owns confirmation progress', () => {
    testSideEffect(
      clearTeeAttestationProgressOnNewTx,
      ({ hot, expectObservable }) => ({
        actionObservables: {
          txExecutor: {
            txPhaseRequested$: hot('a-b-c-d', {
              a: txPhaseRequested('Midnight', 'buildTx'),
              b: txPhaseRequested('Midnight', 'confirmTx'),
              c: txPhaseRequested('Midnight', 'submitTx'),
              d: txPhaseRequested('Cardano', 'confirmTx'),
            }) as never,
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a------', {
            a: actions.midnightContext.teeAttestationProgressCleared(),
          });
        },
      }),
    );
  });
});

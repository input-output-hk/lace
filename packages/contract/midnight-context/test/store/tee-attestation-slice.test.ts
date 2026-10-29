import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  midnightContextActions,
  midnightContextReducers,
  midnightContextSelectors,
} from '../../src/store/slice';

import type {
  AttestationProgressEvent,
  AttestationProgressState,
} from '../../src/types';

const reducer = midnightContextReducers.midnightTeeAttestation;
const { teeAttestationProgressUpdated, teeAttestationProgressStarted } =
  midnightContextActions.midnightContext;
const started = (operationId = 'send-1') =>
  teeAttestationProgressStarted({
    type: 'begin',
    operationId,
    accountId: AccountId('midnight-account-1'),
  });
const updated = (event: AttestationProgressEvent, operationId = 'send-1') =>
  teeAttestationProgressUpdated({ type: 'progress', operationId, event });

const foldEvents = (
  events: AttestationProgressEvent[],
): AttestationProgressState =>
  events.reduce(
    (state, event) => reducer(state, updated(event)),
    reducer(undefined, events.length ? started() : { type: 'unrelated' }),
  );

const ALL_STEP_IDS = [
  'obtain-evidence',
  'fetch-expected-values',
  'verify-locally',
  'warden-verify',
  'bind-channel',
  'proving',
] as const;

describe('midnightTeeAttestation slice', () => {
  it('starts idle with no steps', () => {
    const state = foldEvents([]);
    expect(state).toEqual({ status: 'idle', steps: [] });
  });

  it('reset starts a running checklist with all steps pending in order', () => {
    const state = foldEvents([{ type: 'reset', steps: [...ALL_STEP_IDS] }]);
    expect(state.status).toBe('running');
    expect(state.steps.map(step => step.id)).toEqual([...ALL_STEP_IDS]);
    expect(state.steps.every(step => step.status === 'pending')).toBe(true);
    expect(state.checks).toBeUndefined();
    expect(state.failure).toBeUndefined();
  });

  it('reset clears state from a previous run', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'phase', phase: 'obtain-evidence', status: 'started' },
      { type: 'phase', phase: 'obtain-evidence', status: 'failed' },
      { type: 'reset', steps: [...ALL_STEP_IDS] },
    ]);
    expect(state.status).toBe('running');
    expect(state.failure).toBeUndefined();
    expect(state.steps.every(step => step.status === 'pending')).toBe(true);
  });

  it('phase started/completed advances only the matching step', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'phase', phase: 'obtain-evidence', status: 'started' },
      { type: 'phase', phase: 'obtain-evidence', status: 'completed' },
      { type: 'phase', phase: 'fetch-expected-values', status: 'started' },
    ]);
    expect(state.steps).toEqual([
      { id: 'obtain-evidence', status: 'done' },
      { id: 'fetch-expected-values', status: 'running' },
      { id: 'verify-locally', status: 'pending' },
      { id: 'warden-verify', status: 'pending' },
      { id: 'bind-channel', status: 'pending' },
      { id: 'proving', status: 'pending' },
    ]);
    expect(state.status).toBe('running');
  });

  it('stores step detail when provided', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      {
        type: 'phase',
        phase: 'verify-locally',
        status: 'completed',
        detail: '9 checks passed',
      },
    ]);
    expect(state.steps.find(step => step.id === 'verify-locally')).toEqual({
      id: 'verify-locally',
      status: 'done',
      detail: '9 checks passed',
    });
  });

  it('accumulates check results one event at a time, in arrival order', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      {
        type: 'check',
        check: { id: 'snp-signature-chain', status: 'passed' },
      },
      {
        type: 'check',
        check: { id: 'tpm-quote-pcr-digest', status: 'failed' },
      },
    ]);
    expect(state.checks).toEqual([
      { id: 'snp-signature-chain', status: 'passed' },
      { id: 'tpm-quote-pcr-digest', status: 'failed' },
    ]);
  });

  it('a re-emitted check replaces the previous result in place', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'check', check: { id: 'snp-signature-chain', status: 'passed' } },
      { type: 'check', check: { id: 'epoch-key-binding', status: 'failed' } },
      { type: 'check', check: { id: 'epoch-key-binding', status: 'passed' } },
    ]);
    expect(state.checks).toEqual([
      { id: 'snp-signature-chain', status: 'passed' },
      { id: 'epoch-key-binding', status: 'passed' },
    ]);
  });

  it('a phase failure freezes the run and records the failed check as root cause', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'phase', phase: 'verify-locally', status: 'started' },
      { type: 'check', check: { id: 'epoch-key-binding', status: 'passed' } },
      {
        type: 'check',
        check: { id: 'tpm-quote-pcr-digest', status: 'failed' },
      },
      { type: 'phase', phase: 'verify-locally', status: 'failed' },
    ]);
    expect(state.status).toBe('failed');
    expect(state.steps.find(step => step.id === 'verify-locally')?.status).toBe(
      'failed',
    );
    expect(state.failure).toEqual({
      phase: 'verify-locally',
      checkId: 'tpm-quote-pcr-digest',
    });
  });

  it('a failure without failed checks records only the phase', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'phase', phase: 'warden-verify', status: 'failed' },
    ]);
    expect(state.status).toBe('failed');
    expect(state.failure).toEqual({ phase: 'warden-verify' });
  });

  it('completing the proving phase marks the run as succeeded', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'phase', phase: 'proving', status: 'started' },
      { type: 'phase', phase: 'proving', status: 'completed' },
    ]);
    expect(state.status).toBe('succeeded');
  });

  it('ignores phase events for steps outside the checklist lifecycle', () => {
    // Events arriving before any reset (steps empty) must not crash the fold.
    const state = foldEvents([
      { type: 'phase', phase: 'obtain-evidence', status: 'started' },
    ]);
    expect(state.steps).toEqual([]);
    expect(state.status).toBe('idle');
  });

  it('teeAttestationProgressCleared returns to idle from any state', () => {
    const failedState = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'phase', phase: 'warden-verify', status: 'failed' },
    ]);
    const cleared = reducer(
      failedState,
      midnightContextActions.midnightContext.teeAttestationProgressCleared(),
    );
    expect(cleared).toEqual({ status: 'idle', steps: [] });
  });

  it('selectTeeAttestationProgress exposes the slice state', () => {
    const sliceState = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
    ]);
    const selected =
      midnightContextSelectors.midnightContext.selectTeeAttestationProgress({
        midnightTeeAttestation: sliceState,
      } as never);
    expect(selected).toBe(sliceState);
  });
});

describe('provider-defined progress', () => {
  it('keeps checks scoped to their phase even when their IDs coincide', () => {
    const state = foldEvents([
      {
        type: 'reset',
        steps: ['example:evidence', 'example:binding', 'checking'],
      },
      {
        type: 'check',
        check: { id: 'signature', phase: 'example:evidence', status: 'passed' },
      },
      {
        type: 'check',
        check: { id: 'signature', phase: 'example:binding', status: 'failed' },
      },
      { type: 'phase', phase: 'example:binding', status: 'failed' },
    ]);
    expect(state.checks).toHaveLength(2);
    expect(state.failure).toMatchObject({
      phase: 'example:binding',
      checkId: 'signature',
    });
  });

  it('does not attach a failed check from a different phase to a later failure', () => {
    const state = foldEvents([
      {
        type: 'reset',
        steps: ['example:evidence', 'example:binding', 'proving'],
      },
      {
        type: 'check',
        check: {
          id: 'measurement',
          phase: 'example:evidence',
          status: 'failed',
        },
      },
      { type: 'phase', phase: 'example:binding', status: 'failed' },
    ]);
    expect(state.failure?.checkId).toBeUndefined();
  });

  it('finishes a supported check operation without naming Temenos phases', () => {
    const state = foldEvents([
      { type: 'reset', steps: ['example:evidence', 'checking'] },
      { type: 'phase', phase: 'example:evidence', status: 'completed' },
      { type: 'phase', phase: 'checking', status: 'completed' },
    ]);
    expect(state.status).toBe('succeeded');
    expect(state.steps.every(step => step.status === 'done')).toBe(true);
  });
});

describe('send operation ownership', () => {
  it('ignores another operation reset, failure and completion while this send is pending', () => {
    const state = foldEvents([
      { type: 'reset', steps: [...ALL_STEP_IDS] },
      { type: 'phase', phase: 'obtain-evidence', status: 'started' },
    ]);
    for (const event of [
      { type: 'reset', steps: ['proving'] },
      { type: 'phase', phase: 'proving', status: 'completed' },
      { type: 'phase', phase: 'obtain-evidence', status: 'failed' },
    ] satisfies AttestationProgressEvent[]) {
      expect(reducer(state, updated(event, 'another-account-or-dapp'))).toBe(
        state,
      );
    }
  });

  it('ignores late events after a new send begins or the form is reset', () => {
    const first = foldEvents([{ type: 'reset', steps: [...ALL_STEP_IDS] }]);
    const next = reducer(first, started('send-2'));
    const late = updated({
      type: 'phase',
      phase: 'proving',
      status: 'completed',
    });
    expect(reducer(next, late)).toBe(next);
    const cleared = reducer(
      next,
      midnightContextActions.midnightContext.teeAttestationProgressCleared(),
    );
    expect(reducer(cleared, late)).toBe(cleared);
  });
});

describe('wallet transaction stages', () => {
  const phase = (
    id: string,
    status: 'completed' | 'failed' | 'started' = 'started',
  ): AttestationProgressEvent => ({
    type: 'phase',
    phase: `transaction-${id}`,
    status,
  });
  it('keeps transaction progress when Temenos resets and finishes its own checklist', () => {
    const state = foldEvents([
      phase('preparing'),
      phase('proving'),
      { type: 'reset', steps: ['proving'] },
      { type: 'phase', phase: 'proving', status: 'completed' },
      phase('finalizing'),
    ]);
    expect(state.status).toBe('succeeded');
    expect(state.transactionSteps?.map(s => s.status)).toEqual([
      'done',
      'done',
      'running',
      'pending',
      'pending',
      'pending',
    ]);
  });
  it('returns to inclusion after retraction and only finishes on finality', () => {
    const events = [
      phase('submitting'),
      phase('inclusion'),
      phase('confirmation'),
      phase('inclusion'),
    ];
    expect(foldEvents(events).transactionSteps?.map(s => s.status)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'running',
      'pending',
    ]);
    expect(
      foldEvents([
        ...events,
        phase('confirmation', 'completed'),
      ]).transactionSteps?.every(s => s.status === 'done'),
    ).toBe(true);
  });
  it('marks the active stage failed without completing later stages', () => {
    expect(
      foldEvents([
        phase('proving'),
        phase('failed', 'failed'),
      ]).transactionSteps?.map(s => s.status),
    ).toEqual(['done', 'failed', 'pending', 'pending', 'pending', 'pending']);
  });
  it('rejects stale operations and clears old stages on a new send', () => {
    const active = foldEvents([phase('proving')]);
    expect(
      reducer(active, updated(phase('confirmation', 'completed'), 'other')),
    ).toBe(active);
    expect(reducer(active, started('new')).transactionSteps).toBeUndefined();
  });
  it('tracks concurrent proving-data requests without negative counts', () => {
    const material = (
      status: 'completed' | 'started',
    ): AttestationProgressEvent => ({
      type: 'phase',
      phase: 'proof-material',
      status,
    });
    expect(
      foldEvents([
        material('started'),
        material('started'),
        material('completed'),
      ]).proofMaterialRequests,
    ).toBe(1);
    expect(foldEvents([material('completed')]).proofMaterialRequests).toBe(0);
  });
});

import { createSlice } from '@reduxjs/toolkit';

import type {
  SendProofProgressEvent,
  AttestationProgressState,
  AttestationStepStatus,
} from '../types';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialTeeAttestationState: AttestationProgressState = {
  status: 'idle',
  steps: [],
};

/**
 * Folds {@link AttestationProgressEvent}s into checklist state for the
 * send-flow processing UI. Transient by design — never persisted; each
 * proof request starts with a `reset`.
 */
export const teeAttestationSlice = createSlice({
  name: 'midnightTeeAttestation',
  initialState: initialTeeAttestationState,
  reducers: {
    /**
     * Back to `idle` (checklist hidden). Dispatched when a new transaction
     * starts building/confirming so a redo never opens the processing
     * screen with the previous run's step results still showing.
     */
    teeAttestationProgressCleared: () => initialTeeAttestationState,
    teeAttestationProgressStarted: (
      _state,
      {
        payload,
      }: PayloadAction<Extract<SendProofProgressEvent, { type: 'begin' }>>,
    ): AttestationProgressState => ({
      ...initialTeeAttestationState,
      operationId: payload.operationId,
      accountId: payload.accountId,
    }),
    teeAttestationProgressUpdated: (
      state,
      {
        payload,
      }: PayloadAction<Extract<SendProofProgressEvent, { type: 'progress' }>>,
    ): AttestationProgressState => {
      if (payload.operationId !== state.operationId) return state;
      const { event } = payload;
      if (event.type === 'phase' && event.phase === 'proof-material')
        return {
          ...state,
          proofMaterialRequests: Math.max(
            0,
            (state.proofMaterialRequests ?? 0) +
              (event.status === 'started' ? 1 : -1),
          ),
        };
      if (event.type === 'phase' && event.phase.startsWith('transaction-')) {
        const ids = [
          'preparing',
          'proving',
          'finalizing',
          'submitting',
          'inclusion',
          'confirmation',
        ];
        const id = event.phase.slice('transaction-'.length);
        const current =
          state.transactionSteps ??
          ids.map(id => ({ id, status: 'pending' as const }));
        if (id === 'failed')
          return {
            ...state,
            transactionSteps: current.map(step =>
              step.status === 'running'
                ? { ...step, status: 'failed' as const }
                : step,
            ),
          };
        const index = ids.indexOf(id);
        if (index < 0) return state;
        return {
          ...state,
          transactionSteps: current.map((step, index_) => ({
            ...step,
            // Submitted may recur after a block retraction: reset later stages.
            status:
              index_ < index
                ? 'done'
                : index_ > index
                ? 'pending'
                : event.status === 'completed'
                ? 'done'
                : event.status === 'failed'
                ? 'failed'
                : 'running',
          })),
        };
      }
      switch (event.type) {
        case 'reset':
          return {
            ...(state.transactionSteps
              ? { transactionSteps: state.transactionSteps }
              : {}),
            operationId: state.operationId,
            accountId: state.accountId,
            status: 'running',
            steps: event.steps.map(id => ({
              id,
              status: 'pending',
            })),
          };
        case 'check': {
          const checks = state.checks ?? [];
          const existingIndex = checks.findIndex(
            check =>
              check.id === event.check.id &&
              (check.phase ?? 'verify-locally') ===
                (event.check.phase ?? 'verify-locally'),
          );
          return {
            ...state,
            checks:
              existingIndex === -1
                ? [...checks, event.check]
                : checks.map((check, index) =>
                    index === existingIndex ? event.check : check,
                  ),
          };
        }
        case 'phase': {
          const stepStatus: AttestationStepStatus =
            event.status === 'started'
              ? 'running'
              : event.status === 'completed'
              ? 'done'
              : 'failed';
          const steps = state.steps.map(step =>
            step.id === event.phase
              ? {
                  ...step,
                  status: stepStatus,
                  ...(event.detail === undefined
                    ? {}
                    : { detail: event.detail }),
                }
              : step,
          );
          if (event.status === 'failed') {
            return {
              ...state,
              steps,
              status: 'failed',
              failure: {
                phase: event.phase,
                // A failed local check is the failure's root cause; its
                // `check` event always precedes the phase failure.
                checkId: state.checks?.find(
                  check =>
                    check.status === 'failed' &&
                    (check.phase ?? 'verify-locally') === event.phase,
                )?.id,
                ...(event.detail === undefined ? {} : { detail: event.detail }),
              },
            };
          }
          return {
            ...state,
            steps,
            ...((event.phase === 'proving' || event.phase === 'checking') &&
            event.status === 'completed'
              ? { status: 'succeeded' as const }
              : {}),
          };
        }
      }
    },
  },
  selectors: {
    selectTeeAttestationProgress: state => state,
  },
});

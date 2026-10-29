import { filter, map } from 'rxjs';

import type { SideEffect } from '../../context';

/**
 * Forwards attested-proving progress from the dependency-level stream into
 * redux, where the send-flow checklist UI reads it. Pure mapping — the
 * events originate inside the proving service (ADR 19).
 */
export const watchTeeAttestationProgress: SideEffect = (
  _actionObservables,
  _stateObservables,
  { actions, teeAttestationProgress$ },
) =>
  teeAttestationProgress$.pipe(
    map(event =>
      event.type === 'begin'
        ? actions.midnightContext.teeAttestationProgressStarted(event)
        : actions.midnightContext.teeAttestationProgressUpdated(event),
    ),
  );

/**
 * Clears the previous run's checklist as soon as a new Midnight transaction
 * starts building, so a redone send never opens the
 * processing screen with stale step results. The attested proving service's
 * `reset` then rebuilds the pending checklist when verification actually
 * begins. The signer owns confirmation resets. Submit must not clear the
 * completed checklist while the transaction is being submitted.
 */
export const clearTeeAttestationProgressOnNewTx: SideEffect = (
  { txExecutor: { txPhaseRequested$ } },
  _stateObservables,
  { actions },
) =>
  txPhaseRequested$.pipe(
    filter(
      ({ payload: { config } }) =>
        config.params.blockchainName === 'Midnight' &&
        config.type === 'buildTx',
    ),
    map(() => actions.midnightContext.teeAttestationProgressCleared()),
  );

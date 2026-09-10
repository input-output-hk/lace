import { getObservability, LogLevel } from '@lace-lib/observability';
import { EMPTY, mergeMap, withLatestFrom } from 'rxjs';

import type { SideEffect } from '../..';

/**
 * Reports a migration that finished without meeting its stated condition of
 * use. A message, not an exception: this is an expected-but-undesired ending,
 * and raising it as a crash would bury it among real ones.
 *
 * It exists because the condition of use is otherwise unmeasurable in
 * production — nobody would learn how often the delegation leg is abandoned,
 * or on which destination type. Carries the destination kind and the failure
 * phase and nothing else: no wallet ids, no addresses, no txIds.
 */
export const makeTrackUndelegatedFinish =
  (): SideEffect => (actionObservables, stateObservables, dependencies) => {
    const {
      migrateWallet: { delegationAbandoned$ },
    } = actionObservables;
    const {
      migrateWallet: { selectDestinationType$, selectDelegationFailurePhase$ },
    } = stateObservables;

    return delegationAbandoned$.pipe(
      withLatestFrom(selectDestinationType$, selectDelegationFailurePhase$),
      mergeMap(([, destinationType, phase]) => {
        try {
          const observability = getObservability();
          // Breadcrumb first: Sentry attaches breadcrumbs only to events
          // captured after them, so the reverse order ships the message
          // without the destination kind and phase it exists to carry.
          observability.addBreadcrumb({
            message: 'migrateWallet.undelegatedFinish',
            category: 'migrateWallet.outcome',
            level: LogLevel.WARNING,
            data: {
              destinationType: destinationType ?? 'unknown',
              phase: phase ?? 'unknown',
            },
          });
          observability.captureMessage(
            'migration finished with the destination undelegated',
            LogLevel.WARNING,
          );
        } catch (error) {
          // Observability throws when no provider is installed (tests, and any
          // host that opts out). A missing telemetry sink must not take down
          // the last screen of a migration whose funds have already moved.
          dependencies.logger.debug(
            '[migrate-wallet] undelegated-finish signal not recorded',
            error,
          );
        }
        return EMPTY;
      }),
    );
  };

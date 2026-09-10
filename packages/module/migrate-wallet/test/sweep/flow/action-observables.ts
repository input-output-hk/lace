import { Subject } from 'rxjs';

import type { SideEffect } from '../../../src';
import type { migrateWalletActions } from '../../../src/store/slice';

type ActionObservables = Parameters<SideEffect>[0];
type MigrateWalletActions = typeof migrateWalletActions.migrateWallet;

export type FlowTriggers = {
  sourceImported$: Subject<ReturnType<MigrateWalletActions['sourceImported']>>;
  sweepStarted$: Subject<ReturnType<MigrateWalletActions['sweepStarted']>>;
};

/**
 * The action streams the side-effects subscribe to, plus the trigger Subjects
 * the driver pushes into. A Subject is both subscribable and pushable, and both
 * halves return the SAME instances, so `triggers.sourceImported$.next(...)` from
 * the driver is received by the side-effect subscribed to it.
 */
export const buildActionObservables = (): {
  actionObservables: ActionObservables;
  triggers: FlowTriggers;
} => {
  const triggers: FlowTriggers = {
    sourceImported$: new Subject(),
    sweepStarted$: new Subject(),
  };
  const actionObservables = {
    migrateWallet: {
      sourceImported$: triggers.sourceImported$,
      sweepStarted$: triggers.sweepStarted$,
      // Inert here, but the side-effects destructure and merge these, so they
      // must be real Subjects rather than absent.
      wizardCancelled$: new Subject(),
      discoveryRetryRequested$: new Subject(),
      sweepRetryRequested$: new Subject(),
    },
  } as unknown as ActionObservables;
  return { actionObservables, triggers };
};

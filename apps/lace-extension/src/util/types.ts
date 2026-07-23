import type { Shutdown } from '@cardano-sdk/util';
import type { Action, State } from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

export interface RemoteStore {
  readonly dispatch: (
    action: Readonly<Action>,
    ...extraArgs: readonly unknown[]
  ) => Promise<void>;
  /**
   * Seed state for the UI's first paint only. Heavy reference catalogs are
   * shipped empty (see `createRemoteStore`) and backfilled over `state$`. Call
   * once during view boot, then read live state from `state$` thereafter — this
   * is not a general-purpose state getter.
   */
  readonly getFirstPaintState: () => Promise<State>;
  readonly state$: Observable<State>;
}

export type LaceStore = Shutdown & Store<State, Action>;

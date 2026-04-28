import type { Shutdown } from '@cardano-sdk/util';
import type { Action, State } from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

export interface RemoteStore {
  readonly dispatch: (
    action: Readonly<Action>,
    ...extraArgs: readonly unknown[]
  ) => Promise<void>;
  readonly getState: () => Promise<State>;
  readonly state$: Observable<State>;
}

export type LaceStore = Shutdown & Store<State, Action>;

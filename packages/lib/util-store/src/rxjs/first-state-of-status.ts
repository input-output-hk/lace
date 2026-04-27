import { distinctUntilChanged, filter } from 'rxjs';

import type { StateObject } from '../create-state-machine';
import type { Observable } from 'rxjs';

export const isStatus = <
  State extends StateObject,
  Status extends State['status'],
>(
  state: State,
  status: Status,
): state is State & { status: Status } => state.status === status;

export const firstStateOfStatus = <
  State extends StateObject,
  Status extends State['status'],
>(
  state$: Observable<State>,
  status: Status,
) =>
  state$.pipe(
    distinctUntilChanged(
      (previous: State, current: State) => previous.status === current.status,
    ),
    filter(state => isStatus(state, status)),
  );

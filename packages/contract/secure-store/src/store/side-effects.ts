import { firstStateOfStatus } from '@lace-lib/util-store';
import { map, switchMap, from } from 'rxjs';

import type { SideEffect } from '../contract';
import type { SecureStore } from '../types';
import type { Observable } from 'rxjs';

export const makeCheckSecureStoreAvailability =
  (isSecureStoreAvailable: () => Observable<boolean>): SideEffect =>
  (_, { secureStore: { selectSecureStoreState$ } }, { actions }) =>
    firstStateOfStatus(selectSecureStoreState$, 'Initialising').pipe(
      switchMap(isSecureStoreAvailable),
      map(available => actions.secureStore.availabilityChecked({ available })),
    );

export const makeIsSecureStoreAvailable = (secureStore: SecureStore) => () =>
  from(secureStore.isAvailableAsync());

export const secureStoreSideEffects: SideEffect[] = [
  (actionObservables, stateObservables, dependencies) => {
    const checkSecureStoreAvailability = makeCheckSecureStoreAvailability(
      makeIsSecureStoreAvailable(dependencies.secureStore),
    );

    return checkSecureStoreAvailability(
      actionObservables,
      stateObservables,
      dependencies,
    );
  },
];

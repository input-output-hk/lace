import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import * as createTrackAccountTransactionHistory from '../../../src/store/side-effects/create-track-account-transaction-history';
import { createTrackOlderAccountTransactionHistory } from '../../../src/store/side-effects/track-account-transaction-history';

import type { Selectors } from '../../../src';
import type { ActionCreators } from '../../../src/contract';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';

describe('createTrackOlderAccountTransactionHistory', () => {
  it('should call createTrackAccountTransactionHistory with the correct parameters', () => {
    const fetchAddressTransactionHistoriesMock = vi.fn();

    const stateObservables = {
      cardanoContext: {
        selectCombinedTransactionHistory$: of({}),
      },
      activities: {
        selectDesiredLoadedActivitiesCountPerAccount$: of({}),
      },
      sync: {
        selectGlobalSyncStatus$: of({}),
      },
    } as unknown as StateObservables<Selectors>;

    const createTrackAccountTransactionHistoryMockResult = vi.fn();
    const loadOlderAccountActivitiesObservableMocked = of('test');
    const getLoadOlderActivitiesObservableMockResult = vi
      .fn()
      .mockReturnValue(loadOlderAccountActivitiesObservableMocked);
    const createTrackAccountTransactionHistoryMock = vi
      .fn()
      .mockReturnValue(createTrackAccountTransactionHistoryMockResult);

    vi.spyOn(
      createTrackAccountTransactionHistory,
      'createTrackAccountTransactionHistory',
    ).mockImplementation(createTrackAccountTransactionHistoryMock);

    vi.spyOn(
      createTrackAccountTransactionHistory,
      'getLoadOlderActivitiesObservable',
    ).mockImplementation(getLoadOlderActivitiesObservableMockResult);

    const sideEffect = createTrackOlderAccountTransactionHistory(
      fetchAddressTransactionHistoriesMock,
    );

    const actionObservables =
      {} as unknown as ActionObservables<ActionCreators>;

    const dependencies = {} as unknown as SideEffectDependencies &
      WithLaceContext<Selectors, ActionCreators>;

    sideEffect(actionObservables, stateObservables, dependencies);

    expect(getLoadOlderActivitiesObservableMockResult).toHaveBeenCalledWith({
      actionObservables,
      activities: stateObservables.activities,
      cardanoContext: stateObservables.cardanoContext,
      sync: stateObservables.sync,
    });

    expect(createTrackAccountTransactionHistoryMock).toHaveBeenCalledWith(
      fetchAddressTransactionHistoriesMock,
      loadOlderAccountActivitiesObservableMocked,
    );
  });
});

import { activitiesActions } from '@lace-contract/activities';
import { walletsActions } from '@lace-contract/wallet-repo';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src';
import { CardanoRewardAccount } from '../../../src';
import * as createTrackAccountTransactionHistory from '../../../src/store/side-effects/create-track-account-transaction-history';
import {
  createTrackNewerAccountTransactionHistory,
  createTrackOlderAccountTransactionHistory,
} from '../../../src/store/side-effects/track-account-transaction-history';
import { cardanoAccount2Addr1, chainId } from '../../mocks';

import type { Selectors } from '../../../src';
import type { ActionCreators } from '../../../src/contract';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';

const actions = {
  ...cardanoContextActions,
  ...activitiesActions,
  ...walletsActions,
};

const rewardAccount1 = CardanoRewardAccount(
  'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx',
);
const cardanoAccount2Addr1WithCardanoData = {
  ...cardanoAccount2Addr1,
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
    rewardAccount: rewardAccount1,
  },
};

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

    expect(getLoadOlderActivitiesObservableMockResult).toHaveBeenCalledWith(
      stateObservables.activities,
      stateObservables.cardanoContext,
      stateObservables.sync,
    );

    expect(createTrackAccountTransactionHistoryMock).toHaveBeenCalledWith(
      fetchAddressTransactionHistoriesMock,
      loadOlderAccountActivitiesObservableMocked,
    );
  });
});

describe('createTrackNewerAccountTransactionHistory', () => {
  it('should call createTrackAccountTransactionHistory with the correct parameters', () => {
    const fetchAddressTransactionHistoriesMock = vi.fn();

    const stateObservables = {
      addresses: {
        selectAllAddresses$: of([cardanoAccount2Addr1WithCardanoData]),
      },
    } as unknown as StateObservables<Selectors>;

    const createTrackAccountTransactionHistoryMockResult = vi.fn();
    const pollObservableMocked = of('test');
    const getPollTransactionsObservableMockResult = vi
      .fn()
      .mockReturnValue(pollObservableMocked);
    const createTrackAccountTransactionHistoryMock = vi
      .fn()
      .mockReturnValue(createTrackAccountTransactionHistoryMockResult);

    vi.spyOn(
      createTrackAccountTransactionHistory,
      'createTrackAccountTransactionHistory',
    ).mockImplementation(createTrackAccountTransactionHistoryMock);

    vi.spyOn(
      createTrackAccountTransactionHistory,
      'getPollTransactionsObservable',
    ).mockImplementation(getPollTransactionsObservableMockResult);

    const sideEffect = createTrackNewerAccountTransactionHistory(
      fetchAddressTransactionHistoriesMock,
    );

    const actionObservables =
      actions as unknown as ActionObservables<ActionCreators>;

    const dependencies = {} as unknown as SideEffectDependencies &
      WithLaceContext<Selectors, ActionCreators>;

    sideEffect(actionObservables, stateObservables, dependencies);

    expect(getPollTransactionsObservableMockResult).toHaveBeenCalledWith(
      stateObservables,
    );

    expect(createTrackAccountTransactionHistoryMock).toHaveBeenCalledWith(
      fetchAddressTransactionHistoriesMock,
      pollObservableMocked,
    );
  });
});

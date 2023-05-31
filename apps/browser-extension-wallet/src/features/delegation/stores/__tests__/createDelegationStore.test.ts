import { renderHook, act } from '@testing-library/react-hooks';
import { stakePoolDetailsSelector, useDelegationStore } from '../createDelegationStore';
import {
  cardanoStakePoolMock,
  TransactionBuildMock,
  cardanoStakePoolSelectedDetails
} from '../../../../utils/mocks/test-helpers';
import { DelegationStore } from '../../types';

describe('Testing useDelegationStore hook', () => {
  test('should return delegation store', () => {
    const { result } = renderHook(() => useDelegationStore());
    expect(result.current.setDelegationBuiltTx).toBeDefined();
    expect(result.current.setSelectedStakePool).toBeDefined();
    expect(result.current.delegationBuiltTx).not.toBeDefined();
    expect(result.current.selectedStakePool).not.toBeDefined();
  });

  test('should return update state of selectedStakepool', () => {
    const { result, waitForValueToChange } = renderHook(() => useDelegationStore());
    expect(result.current.setSelectedStakePool).toBeDefined();

    act(() => {
      result.current.setSelectedStakePool(cardanoStakePoolMock.pageResults[0]);
    });
    waitForValueToChange(() => result.current.selectedStakePool);
    expect(result.current.selectedStakePool).toEqual(cardanoStakePoolMock.pageResults[0]);
  });

  test('should return update state of delegationBuiltTx', () => {
    const { result, waitForValueToChange } = renderHook(() => useDelegationStore());
    expect(result.current.setDelegationBuiltTx).toBeDefined();

    act(() => {
      result.current.setDelegationBuiltTx(TransactionBuildMock);
    });
    waitForValueToChange(() => result.current.delegationBuiltTx);
    expect(result.current.delegationBuiltTx).toEqual(TransactionBuildMock);
  });

  test('should return proper data form stakePoolDetailsSelector', () => {
    expect(
      stakePoolDetailsSelector({ selectedStakePool: cardanoStakePoolMock.pageResults[0] } as unknown as DelegationStore)
    ).toEqual(cardanoStakePoolSelectedDetails);
  });
});

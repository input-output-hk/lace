import { renderHook, act } from '@testing-library/react-hooks';
import { stakePoolDetailsSelector, useDelegationStore } from '../createDelegationStore';
import { cardanoStakePoolMock, cardanoStakePoolSelectedDetails } from '../../../../utils/mocks/test-helpers';
import { DelegationStore } from '../../types';
import { TxBuilder } from '@cardano-sdk/tx-construction';

describe('Testing useDelegationStore hook', () => {
  test('should return delegation store', () => {
    const { result } = renderHook(() => useDelegationStore());
    expect(result.current.setDelegationTxBuilder).toBeDefined();
    expect(result.current.setSelectedStakePool).toBeDefined();
    expect(result.current.delegationTxBuilder).not.toBeDefined();
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

  test('should return update state of delegationTxBuilder', () => {
    const txBuilderMock = {} as TxBuilder;
    const { result, waitForValueToChange } = renderHook(() => useDelegationStore());
    expect(result.current.setDelegationTxBuilder).toBeDefined();

    act(() => {
      result.current.setDelegationTxBuilder(txBuilderMock);
    });
    waitForValueToChange(() => result.current.delegationTxBuilder);
    expect(result.current.delegationTxBuilder).toEqual(txBuilderMock);
  });

  test('should return proper data form stakePoolDetailsSelector', () => {
    expect(
      stakePoolDetailsSelector({ selectedStakePool: cardanoStakePoolMock.pageResults[0] } as unknown as DelegationStore)
    ).toEqual(cardanoStakePoolSelectedDetails);
  });
});

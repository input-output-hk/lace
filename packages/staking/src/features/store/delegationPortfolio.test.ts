import { act, renderHook } from '@testing-library/react-hooks';
import { beforeEach, expect } from 'vitest';
import { useDelegationPortfolioStore } from './delegationPortfolio';
import { Cip17Pool } from './types';

const dummyPool1: Cip17Pool = {
  id: 'pool1mxqjlrfskhd5kql9kak06fpdh8xjwc76gec76p3taqy2qmfzs5z',
  name: 'Example Pool 1',
  weight: 0.5,
};
const dummyPool2: Cip17Pool = {
  id: 'pool14u30jkg45xwd27kmznz43hxy596lvrrpj0wz8w9a9k97kmt4p2d',
  name: 'Example Pool 2',
  weight: 0.5,
};

describe('delegationPortfolioStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.clearDelegationPortfolio());
  });

  it('initializes the portfolio preferences', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    expect(result.current.delegationPortfolioPools).toEqual([]);
  });

  it('adds pools to portfolio', () => {
    const newLength = 2;
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.addPoolToPortfolio(dummyPool1));
    act(() => result.current.addPoolToPortfolio(dummyPool2));
    expect(result.current.delegationPortfolioPools.length).toEqual(newLength);
  });

  it('removes pool from portfolio', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.addPoolToPortfolio(dummyPool1));
    act(() => result.current.addPoolToPortfolio(dummyPool2));
    act(() => result.current.removePoolFromPortfolio({ poolId: dummyPool1.id }));
    expect(result.current.delegationPortfolioPools.length).toEqual(1);
    expect(result.current.delegationPortfolioPools[0]!.id).toEqual(dummyPool2.id);
  });

  it('updates the weight of specific pool', async () => {
    const newWeight = 0.75;
    const { result } = renderHook(() => useDelegationPortfolioStore((state) => state));
    act(() => result.current.addPoolToPortfolio(dummyPool1));
    act(() => result.current.addPoolToPortfolio(dummyPool2));
    act(() => result.current.updatePoolWeight({ poolId: dummyPool1.id, weight: 0.75 }));
    expect(result.current.delegationPortfolioPools[0]!.weight).toEqual(newWeight);
    expect(result.current.delegationPortfolioPools[1]!.weight).toEqual(dummyPool2.weight);
  });

  it('clears the portfolio', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore((state) => state));
    act(() => result.current.addPoolToPortfolio(dummyPool1));
    act(() => result.current.clearDelegationPortfolio());
    expect(result.current.delegationPortfolioPools.length).toEqual(0);
  });
});

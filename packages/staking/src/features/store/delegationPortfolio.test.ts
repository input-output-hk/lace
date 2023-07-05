import { Wallet } from '@lace/cardano';
import { act, renderHook } from '@testing-library/react-hooks';
import { beforeEach, expect } from 'vitest';
import { useDelegationPortfolioStore } from './delegationPortfolio';

const dummyPool1: Wallet.Cardano.Cip17Pool = {
  id: Wallet.Cardano.PoolIdHex('pool1mxqjlrfskhd5kql9kak06fpdh8xjwc76gec76p3taqy2qmfzs5z'),
  name: 'Example Pool 1',
  weight: 0.5,
};
const dummyPool2: Wallet.Cardano.Cip17Pool = {
  id: Wallet.Cardano.PoolIdHex('pool14u30jkg45xwd27kmznz43hxy596lvrrpj0wz8w9a9k97kmt4p2d'),
  name: 'Example Pool 2',
  weight: 0.5,
};

describe('delegationPortfolioStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.clearDraft());
  });

  it('initializes the portfolio preferences', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    expect(result.current.draftPortfolio).toEqual([]);
  });

  it('adds pools to portfolio', () => {
    const newLength = 2;
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.addPoolToDraft(dummyPool2));
    expect(result.current.draftPortfolio.length).toEqual(newLength);
  });

  it('removes pool from portfolio', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.addPoolToDraft(dummyPool2));
    act(() => result.current.mutators.removePoolFromDraft({ id: dummyPool1.id }));
    expect(result.current.draftPortfolio.length).toEqual(1);
    expect(result.current.draftPortfolio[0]?.id).toEqual(dummyPool2.id);
  });

  it('updates the weight of specific pool', async () => {
    const newWeight = 0.75;
    const { result } = renderHook(() => useDelegationPortfolioStore((state) => state));
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.addPoolToDraft(dummyPool2));
    act(() => result.current.mutators.updatePoolWeight({ id: dummyPool1.id, weight: 0.75 }));
    expect(result.current.draftPortfolio[0]?.weight).toEqual(newWeight);
    expect(result.current.draftPortfolio[1]?.weight).toEqual(dummyPool2.weight);
  });

  it('clears the portfolio', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore((state) => state));
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.clearDraft());
    expect(result.current.draftPortfolio.length).toEqual(0);
  });
});

/* eslint-disable no-magic-numbers */
import * as sdkUtils from '@cardano-sdk/util';
import { Wallet } from '@lace/cardano';
import { act, renderHook } from '@testing-library/react-hooks';
import { beforeEach, expect, it } from 'vitest';
import { useDelegationPortfolioStore } from './delegationPortfolio';
import { CurrentPortfolioStakePool } from './types';

const dummyPool1 = {
  id: Wallet.Cardano.PoolIdHex('39deffa1dfcfe192ea0efeb3e9bcd9878190627fb590ec81f390cd6d'),
  name: '8BOOL',
  ticker: '8BOOL',
  weight: 1,
} as CurrentPortfolioStakePool;
const dummyPool2 = {
  id: Wallet.Cardano.PoolIdHex('39faf89aba3daab2bce656a9698b0a2c05e679c0fb360ee6e3b46acb'),
  name: '8BOOM',
  ticker: '8BOOM',
  weight: 1,
} as CurrentPortfolioStakePool;
const dummyPool3 = {
  id: Wallet.Cardano.PoolIdHex('3867a09729a1f954762eea035a82e2d9d3a14f1fa791a022ef0da242'),
  name: 'ADA Capital',
  ticker: 'ADACT',
  weight: 1,
} as CurrentPortfolioStakePool;
const dummyPool4 = {
  id: Wallet.Cardano.PoolIdHex('a0e79024226e4febf20214164d88dcd269c54819fc3b810ca5cc45a5'),
  name: 'Example Pool 4',
  weight: 1,
} as CurrentPortfolioStakePool;
const dummyPool5 = {
  id: Wallet.Cardano.PoolIdHex('cde2511b7638ab734db8534daebb9a2243c4ef1694c82f85b8825be9'),
  name: 'Example Pool 5',
  weight: 1,
} as CurrentPortfolioStakePool;
const dummyPool6 = {
  id: Wallet.Cardano.PoolIdHex('b546d6339727ae557830265c581381735a4f797591ff8f56e14082c6'),
  name: 'Example Pool 6',
  weight: 1,
} as CurrentPortfolioStakePool;

const dummyStakePool1 = {
  cost: BigInt(340_000_000),
  hexId: dummyPool1.id,
  id: Wallet.Cardano.PoolId('pool18800lgwlelse96swl6e7n0xes7qeqcnlkkgweq0njrxk66zlj9a'),
  metadata: {
    name: '8BOOL',
    ticker: '8BOOL',
  },
  metrics: {},
  pledge: BigInt(1_000_000_000),
} as Wallet.Cardano.StakePool;
const dummyStakePool2 = {
  cost: BigInt(340_000_000),
  hexId: dummyPool2.id,
  id: Wallet.Cardano.PoolId('pool188a03x468k4t908x265knzc29sz7v7wqlvmqaehrk34vkll3e2h'),
  metadata: {
    name: '8BOOM',
    ticker: '8BOOM',
  },
  metrics: {},
  pledge: BigInt(7_000_000_000),
} as Wallet.Cardano.StakePool;
const dummyStakePool3 = {
  cost: BigInt(340_000_000),
  hexId: dummyPool3.id,
  id: Wallet.Cardano.PoolId('pool18pn6p9ef58u4ga3wagp44qhzm8f6zncl57g6qgh0pk3yytwz54h'),
  metadata: {
    name: 'ADA Capital',
    ticker: 'ADACT',
  },
  metrics: {},
  pledge: BigInt(1_659_000_000_000),
} as Wallet.Cardano.StakePool;

describe('delegationPortfolioStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.clearDraft());
  });

  it('initializes the portfolio preferences', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    expect(result.current.currentPortfolio).toEqual([]);
    expect(result.current.draftPortfolio).toEqual([]);
  });

  it('adds pools to portfolio preserving the max allowed count', () => {
    const newLength = 5;
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.addPoolToDraft(dummyPool2));
    act(() => result.current.mutators.addPoolToDraft(dummyPool3));
    act(() => result.current.mutators.addPoolToDraft(dummyPool4));
    act(() => result.current.mutators.addPoolToDraft(dummyPool5));
    act(() => result.current.mutators.addPoolToDraft(dummyPool6));
    expect(result.current.draftPortfolio.length).toEqual(newLength);
  });

  it('prevents adding a same pool twice', () => {
    const newLength = 1;
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    expect(result.current.draftPortfolio.length).toEqual(newLength);
  });

  it('removes pool from portfolio', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.addPoolToDraft(dummyPool2));
    act(() => result.current.mutators.removePoolFromDraft({ id: dummyPool1.id }));
    act(() => result.current.mutators.removePoolFromDraft({ id: dummyPool3.id }));
    expect(result.current.draftPortfolio.length).toEqual(1);
    expect(result.current.draftPortfolio[0]?.id).toEqual(dummyPool2.id);
  });

  it('updates the weight of specific pool', async () => {
    const newWeight = 0.75;
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.addPoolToDraft(dummyPool2));
    act(() => result.current.mutators.updatePoolWeight({ id: dummyPool1.id, weight: 0.75 }));
    expect(result.current.draftPortfolio[0]?.weight).toEqual(newWeight);
    expect(result.current.draftPortfolio[1]?.weight).toEqual(dummyPool2.weight);
  });

  it('clears the portfolio', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() => result.current.mutators.addPoolToDraft(dummyPool1));
    act(() => result.current.mutators.clearDraft());
    expect(result.current.draftPortfolio.length).toEqual(0);
  });

  it('sets the current portfolio', () => {
    const expectedLength = 3;
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() =>
      result.current.mutators.setCurrentPortfolio({
        cardanoCoin: { symbol: 'ADA' } as Wallet.CoinId,
        delegationDistribution: [
          {
            percentage: sdkUtils.Percent(33.33),
            pool: dummyStakePool1,
            rewardAccounts: [],
            stake: BigInt(1),
          },
          {
            percentage: sdkUtils.Percent(33.33),
            pool: dummyStakePool2,
            rewardAccounts: [],
            stake: BigInt(1),
          },
          {
            percentage: sdkUtils.Percent(33.33),
            pool: dummyStakePool3,
            rewardAccounts: [],
            stake: BigInt(1),
          },
        ],
      })
    );
    act(() => result.current.mutators.clearDraft());
    expect(result.current.currentPortfolio.length).toEqual(expectedLength);
    expect(result.current.currentPortfolio).toEqual(
      expect.arrayContaining([
        expect.objectContaining(dummyPool1),
        expect.objectContaining(dummyPool2),
        expect.objectContaining(dummyPool3),
      ])
    );
  });
});

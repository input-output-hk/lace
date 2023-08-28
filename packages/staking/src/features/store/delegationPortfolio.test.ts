/* eslint-disable no-magic-numbers, sonarjs/no-identical-functions */
import { Wallet } from '@lace/cardano';
import { act, renderHook } from '@testing-library/react-hooks';
import { beforeEach, expect, it } from 'vitest';
import { MAX_POOLS_COUNT, useDelegationPortfolioStore } from './delegationPortfolio';
import { CurrentPortfolioStakePool, PortfolioManagementProcess } from './types';

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
  it('initializes the portfolio preferences', () => {
    const { result } = renderHook(() => useDelegationPortfolioStore());
    expect(result.current.activeManagementProcess).toEqual(PortfolioManagementProcess.None);
    expect(result.current.currentPortfolio).toEqual([]);
    expect(result.current.draftPortfolio).toEqual([]);
    expect(result.current.selections).toEqual([]);
  });

  it('sets the current portfolio', () => {
    const expectedLength = 3;
    const { result } = renderHook(() => useDelegationPortfolioStore());
    act(() =>
      result.current.mutators.setCurrentPortfolio({
        cardanoCoin: { symbol: 'ADA' } as Wallet.CoinId,
        delegationDistribution: [
          {
            percentage: Wallet.Percent(33.33),
            pool: dummyStakePool1,
            rewardAccounts: [],
            stake: BigInt(1),
          },
          {
            percentage: Wallet.Percent(33.33),
            pool: dummyStakePool2,
            rewardAccounts: [],
            stake: BigInt(1),
          },
          {
            percentage: Wallet.Percent(33.33),
            pool: dummyStakePool3,
            rewardAccounts: [],
            stake: BigInt(1),
          },
        ],
      })
    );
    expect(result.current.currentPortfolio.length).toEqual(expectedLength);
    expect(result.current.currentPortfolio).toEqual([
      expect.objectContaining({
        ...dummyPool1,
        weight: 33.33,
      }),
      expect.objectContaining({
        ...dummyPool2,
        weight: 33.33,
      }),
      expect.objectContaining({
        ...dummyPool3,
        weight: 33.33,
      }),
    ]);
  });

  describe('selections', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.clearSelections());
    });

    it('allows for selecting pools preserving the max allowed count', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.selectPool(dummyPool1));
      act(() => result.current.mutators.selectPool(dummyPool2));
      act(() => result.current.mutators.selectPool(dummyPool3));
      act(() => result.current.mutators.selectPool(dummyPool4));
      act(() => result.current.mutators.selectPool(dummyPool5));
      act(() => result.current.mutators.selectPool(dummyPool6));
      expect(result.current.selections.length).toEqual(MAX_POOLS_COUNT);
    });

    it('prevents selecting a same pool twice', () => {
      const newLength = 1;
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.selectPool(dummyPool1));
      act(() => result.current.mutators.selectPool(dummyPool1));
      expect(result.current.selections.length).toEqual(newLength);
    });

    it('allows to unselect pool', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.selectPool(dummyPool1));
      act(() => result.current.mutators.selectPool(dummyPool2));
      act(() => result.current.mutators.unselectPool({ id: dummyPool1.id }));
      act(() => result.current.mutators.unselectPool({ id: dummyPool3.id }));
      expect(result.current.selections.length).toEqual(1);
      expect(result.current.selections[0]?.id).toEqual(dummyPool2.id);
    });

    it('clears the selections', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.selectPool(dummyPool1));
      act(() => result.current.mutators.selectPool(dummyPool2));
      act(() => result.current.mutators.clearSelections());
      expect(result.current.selections.length).toEqual(0);
    });
  });

  describe('current portfolio management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.setCurrentPortfolio({
          cardanoCoin: { symbol: 'ADA' } as Wallet.CoinId,
          delegationDistribution: [
            {
              percentage: Wallet.Percent(33.33),
              pool: dummyStakePool1,
              rewardAccounts: [],
              stake: BigInt(1),
            },
            {
              percentage: Wallet.Percent(33.33),
              pool: dummyStakePool2,
              rewardAccounts: [],
              stake: BigInt(1),
            },
            {
              percentage: Wallet.Percent(33.33),
              pool: dummyStakePool3,
              rewardAccounts: [],
              stake: BigInt(1),
            },
          ],
        });
      });
      act(() => result.current.mutators.beginManagementProcess(PortfolioManagementProcess.CurrentPortfolio));
    });

    it('sets the currentPortfolio as activeManagementProcess when started', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      expect(result.current.activeManagementProcess).toEqual(PortfolioManagementProcess.CurrentPortfolio);
    });
    it('copies the currentPortfolio items to the draftPortfolio when started', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      expect(result.current.draftPortfolio).toEqual(result.current.currentPortfolio);
    });
    it('re-sets the activeManagementProcess to none when canceled', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.cancelManagementProcess();
      });
      expect(result.current.activeManagementProcess).toEqual(PortfolioManagementProcess.None);
    });
    it('clears the draftPortfolio when canceled', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.cancelManagementProcess();
      });
      expect(result.current.draftPortfolio).toEqual([]);
    });
    it('dumps draftPortfolio to selections when canceled with dumpDraftToSelections flag', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.cancelManagementProcess({ dumpDraftToSelections: true });
      });
      expect(result.current.selections).toEqual([
        expect.objectContaining(dummyPool1),
        expect.objectContaining(dummyPool2),
        expect.objectContaining(dummyPool3),
      ]);
    });
    it('re-sets the activeManagementProcess to none when finalized', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.finalizeManagementProcess();
      });
      expect(result.current.activeManagementProcess).toEqual(PortfolioManagementProcess.None);
    });
    it('clears the draftPortfolio when finalized', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.finalizeManagementProcess();
      });
      expect(result.current.draftPortfolio).toEqual([]);
    });
    it('allows to remove pool from draftPortfolio', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.removePoolInManagementProcess({ id: dummyPool1.id }));
      expect(result.current.draftPortfolio).toEqual([
        expect.objectContaining({
          ...dummyPool2,
          weight: 33.33,
        }),
        expect.objectContaining({
          ...dummyPool3,
          weight: 33.33,
        }),
      ]);
    });
  });

  describe('new portfolio management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.selectPool(dummyPool2));
      act(() => result.current.mutators.selectPool(dummyPool3));
      act(() => result.current.mutators.selectPool(dummyPool4));
      act(() => result.current.mutators.selectPool(dummyPool5));
      act(() => result.current.mutators.beginManagementProcess(PortfolioManagementProcess.NewPortfolio));
    });

    it('sets the newPortfolio as activeManagementProcess when started', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      expect(result.current.activeManagementProcess).toEqual(PortfolioManagementProcess.NewPortfolio);
    });
    it('copies the selections items to the draftPortfolio when started', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      expect(result.current.draftPortfolio).toEqual(result.current.selections);
    });
    it('re-sets the activeManagementProcess to none when canceled', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.cancelManagementProcess();
      });
      expect(result.current.activeManagementProcess).toEqual(PortfolioManagementProcess.None);
    });
    it('clears the draftPortfolio when canceled', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.cancelManagementProcess();
      });
      expect(result.current.draftPortfolio).toEqual([]);
    });
    it('re-sets the activeManagementProcess to none when finalized', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.finalizeManagementProcess();
      });
      expect(result.current.activeManagementProcess).toEqual(PortfolioManagementProcess.None);
    });
    it('clears the draftPortfolio when finalized', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.finalizeManagementProcess();
      });
      expect(result.current.draftPortfolio).toEqual([]);
    });
    it('clears the selections when finalized', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => {
        result.current.mutators.finalizeManagementProcess();
      });
      expect(result.current.selections).toEqual([]);
    });
    it('allows to remove pool from draftPortfolio', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.removePoolInManagementProcess({ id: dummyPool3.id }));
      expect(result.current.draftPortfolio).toEqual([dummyPool2, dummyPool4, dummyPool5]);
    });
    it('removes pool from selections when removed pool in management process', () => {
      const { result } = renderHook(() => useDelegationPortfolioStore());
      act(() => result.current.mutators.removePoolInManagementProcess({ id: dummyPool1.id }));
      expect(result.current.selections).toEqual([dummyPool2, dummyPool4, dummyPool5]);
    });
  });
});

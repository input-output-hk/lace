import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { cardanoStakePoolsActions as actions } from '../../src';
import {
  cardanoStakePoolsSideEffects,
  createDeleteExpiredPools,
  createLoadStakePool,
  createStakePoolsNetworkData,
} from '../../src/store/side-effects';

import type {
  BlockfrostPartialStakePool,
  CardanoStakePoolsProvider,
  StakePoolsNetworkData,
} from '../../src/types';

const poolId = 'sp1' as Cardano.PoolId;
const otherPoolId = 'sp2' as Cardano.PoolId;

const chainId = Cardano.ChainIds.Mainnet;
const mainnetNetworkId = CardanoNetworkId(chainId.networkMagic);
const TEST_NOW_MS = 1_700_000_000_000;

const providerNetworkPayload: StakePoolsNetworkData = {
  activeSlotsCoefficient: 0.05,
  desiredNumberOfPools: 500,
  epochLength: 432000,
  liveStake: 1,
  maxLovelaceSupply: 10,
  monetaryExpansion: 0.003,
  poolInfluence: 0.3,
  reserves: 2,
  retiringPools: [],
  slotLength: 1,
  timestamp: 0,
};

const blockfrostPool = {
  active_stake: '1000',
  blocks_minted: 2,
  declared_pledge: '5000000',
  fixed_cost: '340000000',
  hex: 'hex1',
  live_delegators: 3,
  live_pledge: '5000000',
  live_saturation: 0.42,
  live_stake: '9000000',
  margin_cost: 0.015,
  owners: ['owner1'],
  pool_id: poolId,
};

const blockfrostMetadata = {
  name: 'Pool Name',
  ticker: 'PN',
  description: 'About',
};

const blockfrostPartialPools: BlockfrostPartialStakePool[] = [
  {
    active_stake: '1000',
    blocks_minted: 2,
    declared_pledge: '5000000',
    fixed_cost: '340000000',
    live_saturation: 0.42,
    live_stake: '9000000',
    margin_cost: 0.015,
    pool_id: poolId,
    metadata: blockfrostMetadata,
  },
  {
    active_stake: '2000',
    blocks_minted: 3,
    declared_pledge: '6000000',
    fixed_cost: '680000000',
    live_saturation: 0.84,
    live_stake: '18000000',
    margin_cost: 0.03,
    pool_id: otherPoolId,
    metadata: null,
  },
];

const expectedPartialListFromNetworkFetch = [
  {
    activeStake: 1000,
    blocks: 2,
    cost: 340000000,
    declaredPledge: 5000000,
    liveSaturation: 42,
    liveStake: 9000000,
    margin: 0.015,
    poolId,
    poolName: 'Pool Name',
    ticker: 'PN',
    description: 'About',
  },
  {
    activeStake: 2000,
    blocks: 3,
    cost: 680000000,
    declaredPledge: 6000000,
    liveSaturation: 84,
    liveStake: 18000000,
    margin: 0.03,
    poolId: otherPoolId,
    poolName: null,
    ticker: null,
    description: null,
  },
];

const activeNetworkData: StakePoolsNetworkData = {
  ...providerNetworkPayload,
  timestamp: 1,
  retiringPools: [],
};

const expectedActivePool = {
  activeStake: 1000,
  blocks: 2,
  cost: 340000000,
  declaredPledge: 5000000,
  description: 'About',
  hexId: 'hex1',
  liveDelegators: 3,
  livePledge: 5000000,
  liveSaturation: 42,
  liveStake: 9000000,
  margin: 0.015,
  owners: ['owner1'],
  poolId,
  poolName: 'Pool Name',
  status: 'active' as const,
  ticker: 'PN',
  timestamp: TEST_NOW_MS,
};

const expectedRetiringPool = {
  ...expectedActivePool,
  status: 'retiring' as const,
};

const blockfrostPoolOther = {
  ...blockfrostPool,
  pool_id: otherPoolId,
  hex: 'hex2',
};

const providerError = new ProviderError(ProviderFailure.ConnectionFailure);

type Overrides = Partial<CardanoStakePoolsProvider>;
export const createProvider = (overrides?: Overrides) =>
  ({
    getNetworkData: vi.fn(),
    getStakePools: vi.fn(),
    getStakePool: vi.fn(),
    getMetadata: vi.fn(),
    ...overrides,
  } as CardanoStakePoolsProvider);

describe('cardano-stake-pools side effects', () => {
  const deps = {
    actions: { cardanoStakePools: actions.cardanoStakePools },
  };

  describe('createStakePoolsNetworkData', () => {
    const staleCachedNetworkData = (timestamp: number) => ({
      [mainnetNetworkId]: {
        ...providerNetworkPayload,
        timestamp,
      },
    });

    it('when both requests succeed: setNetworkData with timestamp 0, then setNetworkData with correct timestamp and setPoolSummaries', () => {
      const fixedNow = 6_000;
      const cacheTtl = 1_000;
      const cardanoStakePoolsProvider = createProvider({
        getNetworkData: vi.fn().mockReturnValue(of(Ok(providerNetworkPayload))),
        getStakePools: vi.fn().mockReturnValue(of(Ok(blockfrostPartialPools))),
      });

      testSideEffect(
        createStakePoolsNetworkData({
          cacheTTL: cacheTtl,
          now: () => fixedNow,
        }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', {
                a: staleCachedNetworkData(5_000)[mainnetNetworkId],
              }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ 1ms !').toBe('(abc)', {
              a: actions.cardanoStakePools.setNetworkData({
                network: mainnetNetworkId,
                data: { ...providerNetworkPayload, timestamp: 0 },
              }),
              b: actions.cardanoStakePools.setNetworkData({
                network: mainnetNetworkId,
                data: { ...providerNetworkPayload, timestamp: fixedNow },
              }),
              c: actions.cardanoStakePools.setPoolSummaries({
                network: mainnetNetworkId,
                summaries: expectedPartialListFromNetworkFetch,
              }),
            });
          },
        }),
      );
    });

    it('when getNetworkData fails first: after retry delay emits the full success flow', () => {
      const fixedNow = 6_000;
      const cacheTtl = 1_000;
      const retryDelay = 20;
      const cardanoStakePoolsProvider = createProvider({
        getNetworkData: vi
          .fn()
          .mockReturnValueOnce(of(Err(providerError)))
          .mockReturnValue(of(Ok(providerNetworkPayload))),
        getStakePools: vi.fn().mockReturnValue(of(Ok(blockfrostPartialPools))),
      });

      testSideEffect(
        createStakePoolsNetworkData({
          cacheTTL: cacheTtl,
          now: () => fixedNow,
          retryDelay,
        }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', {
                a: staleCachedNetworkData(5_000)[mainnetNetworkId],
              }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, `^ ${retryDelay + 5}ms !`).toBe(
              `${retryDelay}ms (abc)`,
              {
                a: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: 0 },
                }),
                b: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: fixedNow },
                }),
                c: actions.cardanoStakePools.setPoolSummaries({
                  network: mainnetNetworkId,
                  summaries: expectedPartialListFromNetworkFetch,
                }),
              },
            );
          },
        }),
      );
    });

    it('when getNetworkData always succeeds and getStakePools fails first: setNetworkData with timestamp 0, then after retry delay the full flow', () => {
      const fixedNow = 6_000;
      const cacheTtl = 1_000;
      const retryDelay = 20;
      const afterRetryGapMs = retryDelay - 1;
      const cardanoStakePoolsProvider = createProvider({
        getNetworkData: vi.fn().mockReturnValue(of(Ok(providerNetworkPayload))),
        getStakePools: vi
          .fn()
          .mockReturnValueOnce(of(Err(providerError)))
          .mockReturnValue(of(Ok(blockfrostPartialPools))),
      });

      testSideEffect(
        createStakePoolsNetworkData({
          cacheTTL: cacheTtl,
          now: () => fixedNow,
          retryDelay,
        }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', {
                a: staleCachedNetworkData(5_000)[mainnetNetworkId],
              }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, `^ ${retryDelay + 5}ms !`).toBe(
              `a ${afterRetryGapMs}ms (abc)`,
              {
                a: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: 0 },
                }),
                b: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: fixedNow },
                }),
                c: actions.cardanoStakePools.setPoolSummaries({
                  network: mainnetNetworkId,
                  summaries: expectedPartialListFromNetworkFetch,
                }),
              },
            );
          },
        }),
      );
    });
  });

  describe('createLoadStakePool', () => {
    it('dispatches setPoolDetails when pool and metadata succeed', () => {
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn().mockReturnValue(of(Ok(blockfrostPool))),
        getMetadata: vi.fn().mockReturnValue(of(Ok(blockfrostMetadata))),
      });

      testSideEffect(
        createLoadStakePool({ now: () => TEST_NOW_MS }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedActivePool,
              }),
            });
          },
        }),
      );
    });

    it('dispatches pool with null metadata fields when getMetadata returns null', () => {
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn().mockReturnValue(of(Ok(blockfrostPool))),
        getMetadata: vi.fn().mockReturnValue(of(Ok(null))),
      });

      const expectedPoolWithoutMetadata = {
        activeStake: 1000,
        blocks: 2,
        cost: 340000000,
        declaredPledge: 5000000,
        description: null,
        hexId: 'hex1',
        liveDelegators: 3,
        livePledge: 5000000,
        liveSaturation: 42,
        liveStake: 9000000,
        margin: 0.015,
        owners: ['owner1'],
        poolId,
        poolName: null,
        status: 'active' as const,
        ticker: null,
        timestamp: TEST_NOW_MS,
      };

      testSideEffect(
        createLoadStakePool({ now: () => TEST_NOW_MS }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedPoolWithoutMetadata,
              }),
            });
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).toHaveBeenCalledTimes(1);
      expect(cardanoStakePoolsProvider.getMetadata).toHaveBeenCalledTimes(1);
    });

    it('dispatches retired pool when pool is not in list cache and providers return null', () => {
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn().mockReturnValue(of(Ok(null))),
        getMetadata: vi.fn().mockReturnValue(of(Ok(null))),
      });

      const expectedRetiredPool = {
        activeStake: 0,
        blocks: 0,
        cost: 0,
        declaredPledge: 0,
        description: null,
        hexId: '',
        liveDelegators: 0,
        livePledge: 0,
        liveSaturation: 0,
        liveStake: 0,
        margin: 0,
        poolName: null,
        owners: [] as string[],
        poolId,
        status: 'retired' as const,
        ticker: null,
        timestamp: TEST_NOW_MS,
      };

      testSideEffect(
        createLoadStakePool({ now: () => TEST_NOW_MS }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedRetiredPool,
              }),
            });
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).toHaveBeenCalledTimes(1);
      expect(cardanoStakePoolsProvider.getMetadata).toHaveBeenCalledTimes(1);
    });

    it('with empty list cache: retries after delay when getStakePool fails once, then emits pool', () => {
      const retryDelay = 20;
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi
          .fn()
          .mockReturnValueOnce(of(Err(providerError)))
          .mockReturnValue(of(Ok(blockfrostPool))),
        getMetadata: vi.fn().mockReturnValue(of(Ok(blockfrostMetadata))),
      });

      testSideEffect(
        createLoadStakePool({
          now: () => TEST_NOW_MS,
          retryDelay,
        }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: [] }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, `^ ${retryDelay + 10}ms !`).toBe(
              `${1 + retryDelay}ms a`,
              {
                a: actions.cardanoStakePools.setPoolDetails({
                  network: mainnetNetworkId,
                  pool: expectedActivePool,
                }),
              },
            );
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).toHaveBeenCalledTimes(2);
      expect(cardanoStakePoolsProvider.getMetadata).toHaveBeenCalledTimes(2);
    });

    it('with empty list cache: retries after delay when getMetadata fails once, then emits pool', () => {
      const retryDelay = 20;
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn().mockReturnValue(of(Ok(blockfrostPool))),
        getMetadata: vi
          .fn()
          .mockReturnValueOnce(of(Err(providerError)))
          .mockReturnValue(of(Ok(blockfrostMetadata))),
      });

      testSideEffect(
        createLoadStakePool({
          now: () => TEST_NOW_MS,
          retryDelay,
        }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: [] }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, `^ ${retryDelay + 10}ms !`).toBe(
              `${1 + retryDelay}ms a`,
              {
                a: actions.cardanoStakePools.setPoolDetails({
                  network: mainnetNetworkId,
                  pool: expectedActivePool,
                }),
              },
            );
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).toHaveBeenCalledTimes(2);
      expect(cardanoStakePoolsProvider.getMetadata).toHaveBeenCalledTimes(2);
    });

    it('does nothing when poolIds is empty', () => {
      const cardanoStakePoolsProvider = createProvider();

      testSideEffect(
        createLoadStakePool(),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).not.toHaveBeenCalled();
      expect(cardanoStakePoolsProvider.getMetadata).not.toHaveBeenCalled();
    });

    it('does not fetch when cached pools are still fresh', () => {
      const fixedNow = 100_000;
      const cacheTtl = 60_000;
      const cardanoStakePoolsProvider = createProvider();

      testSideEffect(
        createLoadStakePool({ cacheTTL: cacheTtl, now: () => fixedNow }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', {
                a: {
                  [poolId]: {
                    ...expectedActivePool,
                    timestamp: fixedNow - cacheTtl + 1,
                  },
                },
              }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).not.toHaveBeenCalled();
      expect(cardanoStakePoolsProvider.getMetadata).not.toHaveBeenCalled();
    });

    it('does not fetch metadata when pool metadata is already in the active list cache', () => {
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn().mockReturnValue(of(Ok(blockfrostPool))),
        getMetadata: vi.fn().mockReturnValue(of(Ok(blockfrostMetadata))),
      });

      testSideEffect(
        createLoadStakePool({ now: () => TEST_NOW_MS }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', {
                a: expectedPartialListFromNetworkFetch,
              }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedActivePool,
              }),
            });
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).toHaveBeenCalledTimes(1);
      expect(cardanoStakePoolsProvider.getMetadata).not.toHaveBeenCalled();
    });

    it('marks pool as retiring when listed in network retiringPools', () => {
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn().mockReturnValue(of(Ok(blockfrostPool))),
        getMetadata: vi.fn().mockReturnValue(of(Ok(blockfrostMetadata))),
      });

      testSideEffect(
        createLoadStakePool({ now: () => TEST_NOW_MS }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', {
                a: { ...activeNetworkData, retiringPools: [poolId] },
              }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedRetiringPool,
              }),
            });
          },
        }),
      );
    });

    /**
     * loadPools fires before network data exists; combineLatest + take(1) waits.
     * Network emits 3 frames after subscription → setPoolDetails is delayed vs the synchronous case.
     */
    it('waits for network data then fetches when loadPools was dispatched first', () => {
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn().mockReturnValue(of(Ok(blockfrostPool))),
        getMetadata: vi.fn().mockReturnValue(of(Ok(blockfrostMetadata))),
      });

      testSideEffect(
        createLoadStakePool({ now: () => TEST_NOW_MS }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-a', {
                a: actions.cardanoStakePools.loadPools([poolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('---a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('----a', {
              a: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedActivePool,
              }),
            });
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).toHaveBeenCalledTimes(1);
      expect(cardanoStakePoolsProvider.getMetadata).toHaveBeenCalledTimes(1);
    });

    /**
     * Two loadPools for different pools: both should fetch (no cross-pool dedupe).
     */
    it('fetches both pools when two loadPools target different pool ids', () => {
      const cardanoStakePoolsProvider = createProvider({
        getStakePool: vi.fn((id: Cardano.PoolId) =>
          id === poolId ? of(Ok(blockfrostPool)) : of(Ok(blockfrostPoolOther)),
        ),
        getMetadata: vi.fn().mockReturnValue(of(Ok(blockfrostMetadata))),
      });

      const expectedOther = {
        activeStake: 1000,
        blocks: 2,
        cost: 340000000,
        declaredPledge: 5000000,
        description: 'About',
        hexId: 'hex2',
        liveDelegators: 3,
        livePledge: 5000000,
        liveSaturation: 42,
        liveStake: 9000000,
        margin: 0.015,
        owners: ['owner1'],
        poolId: otherPoolId,
        poolName: 'Pool Name',
        status: 'active' as const,
        ticker: 'PN',
        timestamp: TEST_NOW_MS,
      };

      testSideEffect(
        createLoadStakePool({ now: () => TEST_NOW_MS }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: {
            cardanoStakePools: {
              loadPools$: hot('-ab', {
                a: actions.cardanoStakePools.loadPools([poolId]),
                b: actions.cardanoStakePools.loadPools([otherPoolId]),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            cardanoStakePools: {
              selectActiveNetworkData$: cold('a', { a: activeNetworkData }),
              selectActivePoolDetails$: cold('a', { a: undefined }),
              selectActivePoolSummaries$: cold('a', { a: undefined }),
            },
          },
          dependencies: { ...deps, cardanoStakePoolsProvider },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-ab', {
              a: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedActivePool,
              }),
              b: actions.cardanoStakePools.setPoolDetails({
                network: mainnetNetworkId,
                pool: expectedOther,
              }),
            });
          },
        }),
      );

      expect(cardanoStakePoolsProvider.getStakePool).toHaveBeenCalledTimes(2);
      expect(cardanoStakePoolsProvider.getMetadata).toHaveBeenCalledTimes(2);
    });
  });

  describe('createDeleteExpiredPools', () => {
    it('dispatches deletePoolDetails for stale pool timestamps', () => {
      const stalePool = {
        poolId,
        activeStake: 0,
        blocks: 0,
        cost: 0,
        declaredPledge: 0,
        description: null,
        hexId: '',
        liveDelegators: 0,
        livePledge: 0,
        liveStake: 0,
        margin: 0,
        liveSaturation: 0,
        owners: [] as string[],
        poolName: null,
        ticker: null,
        status: 'active' as const,
        timestamp: 100,
      };

      testSideEffect(
        createDeleteExpiredPools({
          cacheTTL: 100,
          interval: 999_999_999_999,
          now: () => 2000,
        }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            cardanoStakePools: {
              selectPoolDetails$: cold('a', {
                a: { [mainnetNetworkId]: { [poolId]: stalePool } },
              }),
            },
          },
          dependencies: deps,
          assertion: sideEffect$ => {
            // timer(0, interval) never completes; unsubscribe after the first tick.
            expectObservable(sideEffect$, '^ 1ms !').toBe('(a)', {
              a: actions.cardanoStakePools.deletePoolDetails({
                network: mainnetNetworkId,
                poolId,
              }),
            });
          },
        }),
      );
    });
  });

  it('registers three side effects on the module', () => {
    expect(cardanoStakePoolsSideEffects).toHaveLength(3);
  });
});

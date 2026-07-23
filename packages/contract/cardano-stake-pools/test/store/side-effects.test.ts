import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
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
import type { AnyAccount } from '@lace-contract/wallet-repo';

const cardanoAccount = { blockchainName: 'Cardano' } as AnyAccount;
const bitcoinAccount = { blockchainName: 'Bitcoin' } as AnyAccount;

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
            wallets: {
              selectActiveNetworkAccounts$: cold('a', { a: [cardanoAccount] }),
            },
          },
          dependencies: {
            ...deps,
            cardanoStakePoolsProvider,
            isWalletActive$: of(true),
          },
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
            wallets: {
              selectActiveNetworkAccounts$: cold('a', { a: [cardanoAccount] }),
            },
          },
          dependencies: {
            ...deps,
            cardanoStakePoolsProvider,
            isWalletActive$: of(true),
          },
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
            wallets: {
              selectActiveNetworkAccounts$: cold('a', { a: [cardanoAccount] }),
            },
          },
          dependencies: {
            ...deps,
            cardanoStakePoolsProvider,
            isWalletActive$: of(true),
          },
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

    describe('cardano account gating', () => {
      const staleCachedNetworkData = (timestamp: number) => ({
        [mainnetNetworkId]: {
          ...providerNetworkPayload,
          timestamp,
        },
      });

      it('does not call getNetworkData when there are no cardano accounts', () => {
        const getNetworkData = vi
          .fn()
          .mockReturnValue(of(Ok(providerNetworkPayload)));
        const cardanoStakePoolsProvider = createProvider({
          getNetworkData,
          getStakePools: vi
            .fn()
            .mockReturnValue(of(Ok(blockfrostPartialPools))),
        });

        testSideEffect(
          createStakePoolsNetworkData({ cacheTTL: 1_000, now: () => 6_000 }),
          ({ cold, expectObservable, hot, flush }) => ({
            stateObservables: {
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              cardanoStakePools: {
                selectActiveNetworkData$: cold('a', {
                  a: staleCachedNetworkData(5_000)[mainnetNetworkId],
                }),
              },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [bitcoinAccount],
                }),
              },
            },
            dependencies: {
              ...deps,
              cardanoStakePoolsProvider,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^---!').toBe('');
              flush();
              expect(getNetworkData).not.toHaveBeenCalled();
            },
          }),
        );
      });

      it('starts fetching when a cardano account is added', () => {
        const cardanoStakePoolsProvider = createProvider({
          getNetworkData: vi
            .fn()
            .mockReturnValue(of(Ok(providerNetworkPayload))),
          getStakePools: vi
            .fn()
            .mockReturnValue(of(Ok(blockfrostPartialPools))),
        });

        testSideEffect(
          createStakePoolsNetworkData({ cacheTTL: 1_000, now: () => 6_000 }),
          ({ cold, expectObservable, hot }) => ({
            stateObservables: {
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              cardanoStakePools: {
                selectActiveNetworkData$: cold('a', {
                  a: staleCachedNetworkData(5_000)[mainnetNetworkId],
                }),
              },
              // No cardano accounts at frame 0; one appears at frame 4.
              wallets: {
                selectActiveNetworkAccounts$: hot('a---b', {
                  a: [bitcoinAccount],
                  b: [bitcoinAccount, cardanoAccount],
                }),
              },
            },
            dependencies: {
              ...deps,
              cardanoStakePoolsProvider,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^----!').toBe('----(abc)', {
                a: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: 0 },
                }),
                b: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: 6_000 },
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

      it('stops fetching when the last cardano account is removed', () => {
        const retryDelay = 10;
        const getNetworkData = vi
          .fn()
          .mockReturnValueOnce(of(Err(providerError)))
          .mockReturnValue(of(Ok(providerNetworkPayload)));
        const cardanoStakePoolsProvider = createProvider({
          getNetworkData,
          getStakePools: vi
            .fn()
            .mockReturnValue(of(Ok(blockfrostPartialPools))),
        });

        testSideEffect(
          createStakePoolsNetworkData({
            cacheTTL: 1_000,
            now: () => 6_000,
            retryDelay,
          }),
          ({ cold, expectObservable, hot, flush }) => ({
            stateObservables: {
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              cardanoStakePools: {
                selectActiveNetworkData$: cold('a', {
                  a: staleCachedNetworkData(5_000)[mainnetNetworkId],
                }),
              },
              // Cardano account at frame 0; removed at frame 5 — before the
              // retryDelay (10ms) expires and would otherwise trigger a
              // second `getNetworkData` call.
              wallets: {
                selectActiveNetworkAccounts$: cold('a----b', {
                  a: [cardanoAccount],
                  b: [bitcoinAccount],
                }),
              },
            },
            dependencies: {
              ...deps,
              cardanoStakePoolsProvider,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, `^ ${retryDelay + 5}ms !`).toBe('');
              flush();
              expect(getNetworkData).toHaveBeenCalledTimes(1);
            },
          }),
        );
      });

      // Regression guard: this test fails if `selectActiveNetworkData$` is
      // moved into the gating `combineLatest` instead of being sampled via
      // `withLatestFrom`. In production, dispatching `setNetworkData` causes
      // this selector to re-emit; reacting to those re-emissions cancels the
      // in-flight `getStakePools` and re-fires `getNetworkData` immediately
      // (the just-dispatched timestamp of 0 collapses `initialDelay` to 0).
      it('does not re-fetch when selectActiveNetworkData$ re-emits while gating signals are stable', () => {
        const getNetworkData = vi
          .fn()
          .mockReturnValue(of(Ok(providerNetworkPayload)));
        const getStakePools = vi
          .fn()
          .mockReturnValue(of(Ok(blockfrostPartialPools)));
        const cardanoStakePoolsProvider = createProvider({
          getNetworkData,
          getStakePools,
        });

        testSideEffect(
          createStakePoolsNetworkData({ cacheTTL: 1_000, now: () => 6_000 }),
          ({ cold, expectObservable, hot, flush }) => ({
            stateObservables: {
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              // Re-emits at frames 1 and 2, simulating store updates from the
              // side effect's own `setNetworkData` dispatches.
              cardanoStakePools: {
                selectActiveNetworkData$: cold('a-b-c', {
                  a: staleCachedNetworkData(5_000)[mainnetNetworkId],
                  b: { ...providerNetworkPayload, timestamp: 0 },
                  c: { ...providerNetworkPayload, timestamp: 6_000 },
                }),
              },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              ...deps,
              cardanoStakePoolsProvider,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^ 10ms !');
              flush();
              expect(getNetworkData).toHaveBeenCalledTimes(1);
              expect(getStakePools).toHaveBeenCalledTimes(1);
            },
          }),
        );
      });
    });

    describe('wallet active gating', () => {
      const staleCachedNetworkData = (timestamp: number) => ({
        [mainnetNetworkId]: {
          ...providerNetworkPayload,
          timestamp,
        },
      });

      it('does not call getNetworkData while wallet is inactive', () => {
        const getNetworkData = vi
          .fn()
          .mockReturnValue(of(Ok(providerNetworkPayload)));
        const cardanoStakePoolsProvider = createProvider({
          getNetworkData,
          getStakePools: vi
            .fn()
            .mockReturnValue(of(Ok(blockfrostPartialPools))),
        });

        testSideEffect(
          createStakePoolsNetworkData({ cacheTTL: 1_000, now: () => 6_000 }),
          ({ cold, expectObservable, hot, flush }) => ({
            stateObservables: {
              // `hot` (no `|`) so the gate stays subscribed across the run.
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              cardanoStakePools: {
                selectActiveNetworkData$: cold('a', {
                  a: staleCachedNetworkData(5_000)[mainnetNetworkId],
                }),
              },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              ...deps,
              cardanoStakePoolsProvider,
              isWalletActive$: hot('f', { f: false }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^---!').toBe('');
              flush();
              expect(getNetworkData).not.toHaveBeenCalled();
            },
          }),
        );
      });

      it('resumes fetching when wallet becomes active', () => {
        const cardanoStakePoolsProvider = createProvider({
          getNetworkData: vi
            .fn()
            .mockReturnValue(of(Ok(providerNetworkPayload))),
          getStakePools: vi
            .fn()
            .mockReturnValue(of(Ok(blockfrostPartialPools))),
        });

        testSideEffect(
          createStakePoolsNetworkData({ cacheTTL: 1_000, now: () => 6_000 }),
          ({ cold, expectObservable, hot }) => ({
            stateObservables: {
              // Inactive at frame 0, becomes active at frame 4.
              // Cold so the sources replay on `whileActive` resubscription.
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              cardanoStakePools: {
                selectActiveNetworkData$: cold('a', {
                  a: staleCachedNetworkData(5_000)[mainnetNetworkId],
                }),
              },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              ...deps,
              cardanoStakePoolsProvider,
              isWalletActive$: hot('f---t', { f: false, t: true }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^----!').toBe('----(abc)', {
                a: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: 0 },
                }),
                b: actions.cardanoStakePools.setNetworkData({
                  network: mainnetNetworkId,
                  data: { ...providerNetworkPayload, timestamp: 6_000 },
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

      // Regression guard: this test fails if `whileActive` is moved
      // mid-pipeline — the leaked `expand` keeps scheduling retries past
      // the lock and `getNetworkData` is called again past frame 5.
      it('stops fetching when wallet transitions from active to inactive', () => {
        const retryDelay = 10;
        const getNetworkData = vi
          .fn()
          .mockReturnValueOnce(of(Err(providerError)))
          .mockReturnValue(of(Ok(providerNetworkPayload)));
        const cardanoStakePoolsProvider = createProvider({
          getNetworkData,
          getStakePools: vi
            .fn()
            .mockReturnValue(of(Ok(blockfrostPartialPools))),
        });

        testSideEffect(
          createStakePoolsNetworkData({
            cacheTTL: 1_000,
            now: () => 6_000,
            retryDelay,
          }),
          ({ cold, expectObservable, hot, flush }) => ({
            stateObservables: {
              // Active at frame 0; locked at frame 5 — before the retryDelay
              // (10ms) expires and would otherwise trigger a second
              // `getNetworkData` call.
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              cardanoStakePools: {
                selectActiveNetworkData$: cold('a', {
                  a: staleCachedNetworkData(5_000)[mainnetNetworkId],
                }),
              },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              ...deps,
              cardanoStakePoolsProvider,
              isWalletActive$: hot('t----f', { t: true, f: false }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, `^ ${retryDelay + 5}ms !`).toBe('');
              flush();
              // First call at frame 0 (failed); retry would have fired at
              // frame 10, but the gate flipped at frame 5 and tore the
              // pipeline down.
              expect(getNetworkData).toHaveBeenCalledTimes(1);
            },
          }),
        );
      });
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
          dependencies: { ...deps, isWalletActive$: of(true) },
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

    describe('wallet active gating', () => {
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

      it('does not emit deletePoolDetails while wallet is inactive', () => {
        testSideEffect(
          createDeleteExpiredPools({
            cacheTTL: 100,
            interval: 999_999_999_999,
            now: () => 2000,
          }),
          ({ cold, expectObservable, hot }) => ({
            stateObservables: {
              // `hot` (no `|`) so the gate stays subscribed across the run.
              cardanoStakePools: {
                selectPoolDetails$: cold('a', {
                  a: { [mainnetNetworkId]: { [poolId]: stalePool } },
                }),
              },
            },
            dependencies: { ...deps, isWalletActive$: hot('f', { f: false }) },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^ 1ms !').toBe('');
            },
          }),
        );
      });

      it('emits deletePoolDetails when wallet becomes active', () => {
        testSideEffect(
          createDeleteExpiredPools({
            cacheTTL: 100,
            interval: 999_999_999_999,
            now: () => 2000,
          }),
          ({ cold, expectObservable, hot }) => ({
            stateObservables: {
              // Inactive at frame 0, becomes active at frame 4.
              cardanoStakePools: {
                selectPoolDetails$: cold('a', {
                  a: { [mainnetNetworkId]: { [poolId]: stalePool } },
                }),
              },
            },
            dependencies: {
              ...deps,
              isWalletActive$: hot('f---t', { f: false, t: true }),
            },
            assertion: sideEffect$ => {
              // On activation, `timer(0, interval)` fires its first tick
              // immediately at frame 4.
              expectObservable(sideEffect$, '^----!').toBe('----(a)', {
                a: actions.cardanoStakePools.deletePoolDetails({
                  network: mainnetNetworkId,
                  poolId,
                }),
              });
            },
          }),
        );
      });

      // Regression guard: this test fails if `whileActive` is moved
      // mid-pipeline — the leaked `timer(0, interval)` keeps ticking past
      // the lock and produces additional `deletePoolDetails` emissions.
      it('stops emitting when wallet transitions from active to inactive', () => {
        const tickInterval = 5;
        testSideEffect(
          createDeleteExpiredPools({
            cacheTTL: 100,
            interval: tickInterval,
            now: () => 2000,
          }),
          ({ cold, expectObservable, hot }) => ({
            stateObservables: {
              // Active at frame 0 (first tick), locked at frame 3
              // (before the second timer tick at frame 5).
              cardanoStakePools: {
                selectPoolDetails$: cold('a', {
                  a: { [mainnetNetworkId]: { [poolId]: stalePool } },
                }),
              },
            },
            dependencies: {
              ...deps,
              isWalletActive$: hot('t--f', { t: true, f: false }),
            },
            assertion: sideEffect$ => {
              // Only the frame-0 tick emits; the frame-5 tick is suppressed.
              expectObservable(sideEffect$, '^ 10ms !').toBe('(a)', {
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
  });

  it('registers three side effects on the module', () => {
    expect(cardanoStakePoolsSideEffects).toHaveLength(3);
  });
});

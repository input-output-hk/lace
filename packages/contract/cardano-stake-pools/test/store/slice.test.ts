import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { describe, expect, it } from 'vitest';

import { cardanoStakePoolsActions as actions } from '../../src';
import {
  cardanoStakePoolsReducers,
  cardanoStakePoolsSelectors,
  initialState,
} from '../../src/store/slice';

import type { LaceStakePool, StakePoolsNetworkData } from '../../src/types';

const poolId = 'sp1' as Cardano.PoolId;
const otherPoolId = 'sp2' as Cardano.PoolId;

const makeStakePool = (overrides?: Partial<LaceStakePool>): LaceStakePool => ({
  activeStake: 0,
  blocks: 0,
  cost: 0,
  declaredPledge: 0,
  description: null,
  hexId: 'abc',
  liveDelegators: 0,
  livePledge: 0,
  liveSaturation: 0,
  liveStake: 0,
  margin: 0,
  poolName: 'N',
  owners: [],
  poolId,
  status: 'active',
  ticker: 'T',
  timestamp: 1,
  ...overrides,
});

const makeNetworkData = (timestamp: number): StakePoolsNetworkData => ({
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
  treasuryCut: 0.2,
  timestamp,
});

describe('cardanoStakePools slice', () => {
  const mainnetId = CardanoNetworkId(Cardano.NetworkMagics.Mainnet);
  const preprodId = CardanoNetworkId(Cardano.NetworkMagics.Preprod);

  const rootState = (
    stakePools: typeof initialState,
    networkType: 'mainnet' | 'testnet' = 'mainnet',
  ) => ({
    network: {
      networkType,
      initialNetworkType: networkType,
      blockchainNetworks: {
        Cardano: { mainnet: mainnetId, testnet: preprodId },
      },
      testnetOptions: {},
    },
    cardanoStakePools: stakePools,
  });

  describe('actions', () => {
    it('loadPools has the expected type and payload', () => {
      const ids = [poolId];
      const action = actions.cardanoStakePools.loadPools(ids);
      expect(action.type).toBe('cardanoStakePools/loadPools');
      expect(action.payload).toEqual(ids);
    });
  });

  describe('reducers', () => {
    describe('setNetworkData', () => {
      it('stores network data by network id', () => {
        const data = makeNetworkData(1);
        const state = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.setNetworkData({
            network: mainnetId,
            data,
          }),
        );
        expect(state.networkData[mainnetId]).toEqual(data);
      });
    });

    describe('poolSelectionMade / poolSelectionCleared', () => {
      const selection = {
        selectionId: 'earn-rewards:acc-1',
        poolId: 'pool1' as Cardano.PoolId,
        ticker: 'AAA',
        poolName: 'Pool A',
        ros: 0.031,
      };

      it('stores the pick, last write winning', () => {
        const first = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.poolSelectionMade(selection),
        );
        // A second pick before consumption is the user changing their mind.
        const second = cardanoStakePoolsReducers.cardanoStakePools(
          first,
          actions.cardanoStakePools.poolSelectionMade({
            ...selection,
            poolId: 'pool2' as Cardano.PoolId,
          }),
        );
        expect(second.poolSelection?.poolId).toBe('pool2');
      });

      it("clears only its own consumer's pick", () => {
        const withSelection = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.poolSelectionMade(selection),
        );
        // A consumer tearing down must not discard a pick just made for a
        // DIFFERENT flow — the id check is the whole point.
        const afterForeignClear = cardanoStakePoolsReducers.cardanoStakePools(
          withSelection,
          actions.cardanoStakePools.poolSelectionCleared({
            selectionId: 'migrate-wallet',
          }),
        );
        expect(afterForeignClear.poolSelection).toEqual(selection);

        const afterOwnClear = cardanoStakePoolsReducers.cardanoStakePools(
          afterForeignClear,
          actions.cardanoStakePools.poolSelectionCleared({
            selectionId: selection.selectionId,
          }),
        );
        expect(afterOwnClear.poolSelection).toBeUndefined();
      });

      // Consumers clear unconditionally on teardown (e.g. a cancelled wizard),
      // so an empty slot must be a no-op, never an error.
      it('tolerates clearing an empty slot', () => {
        const state = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.poolSelectionCleared({
            selectionId: 'migrate-wallet',
          }),
        );
        expect(state.poolSelection).toBeUndefined();
      });

      it('exposes the pick via selectPoolSelection', () => {
        const state = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.poolSelectionMade(selection),
        );
        expect(
          cardanoStakePoolsSelectors.cardanoStakePools.selectPoolSelection({
            cardanoStakePools: state,
          }),
        ).toEqual(selection);
      });
    });

    describe('setPoolDetails', () => {
      it('merges pools by network id', () => {
        const pool = makeStakePool();
        const state = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.setPoolDetails({
            network: mainnetId,
            pool,
          }),
        );
        expect(state.poolDetails[mainnetId]?.[poolId]).toEqual(pool);
      });

      it('keeps other pools when adding a second pool', () => {
        const first = makeStakePool();
        const second = makeStakePool({ poolId: otherPoolId, ticker: 'X' });
        let state = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.setPoolDetails({
            network: mainnetId,
            pool: first,
          }),
        );
        state = cardanoStakePoolsReducers.cardanoStakePools(
          state,
          actions.cardanoStakePools.setPoolDetails({
            network: mainnetId,
            pool: second,
          }),
        );
        expect(state.poolDetails[mainnetId]?.[poolId]).toEqual(first);
        expect(state.poolDetails[mainnetId]?.[otherPoolId]).toEqual(second);
      });
    });

    describe('deletePoolDetails', () => {
      it('removes a pool and leaves the rest of the map intact', () => {
        let state = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.setPoolDetails({
            network: mainnetId,
            pool: makeStakePool(),
          }),
        );
        state = cardanoStakePoolsReducers.cardanoStakePools(
          state,
          actions.cardanoStakePools.setPoolDetails({
            network: mainnetId,
            pool: makeStakePool({ poolId: otherPoolId }),
          }),
        );
        state = cardanoStakePoolsReducers.cardanoStakePools(
          state,
          actions.cardanoStakePools.deletePoolDetails({
            network: mainnetId,
            poolId,
          }),
        );
        expect(state.poolDetails[mainnetId]?.[poolId]).toBeUndefined();
        expect(state.poolDetails[mainnetId]?.[otherPoolId]).toBeDefined();
      });

      it('no-ops when network or pool is missing', () => {
        const populated = cardanoStakePoolsReducers.cardanoStakePools(
          initialState,
          actions.cardanoStakePools.setPoolDetails({
            network: mainnetId,
            pool: makeStakePool(),
          }),
        );
        const afterUnknownNet = cardanoStakePoolsReducers.cardanoStakePools(
          populated,
          actions.cardanoStakePools.deletePoolDetails({
            network: preprodId,
            poolId,
          }),
        );
        expect(afterUnknownNet).toEqual(populated);
        const afterUnknownPool = cardanoStakePoolsReducers.cardanoStakePools(
          populated,
          actions.cardanoStakePools.deletePoolDetails({
            network: mainnetId,
            poolId: otherPoolId,
          }),
        );
        expect(afterUnknownPool).toEqual(populated);
      });
    });
  });

  describe('selectors', () => {
    it('selectNetworkData returns the whole map', () => {
      const data = makeNetworkData(5);
      const stakePools = cardanoStakePoolsReducers.cardanoStakePools(
        initialState,
        actions.cardanoStakePools.setNetworkData({
          network: mainnetId,
          data,
        }),
      );
      expect(
        cardanoStakePoolsSelectors.cardanoStakePools.selectNetworkData({
          cardanoStakePools: stakePools,
        }),
      ).toEqual({ [mainnetId]: data });
    });

    it('selectPoolDetails returns the whole map', () => {
      const pool = makeStakePool();
      const stakePools = cardanoStakePoolsReducers.cardanoStakePools(
        initialState,
        actions.cardanoStakePools.setPoolDetails({ network: mainnetId, pool }),
      );
      expect(
        cardanoStakePoolsSelectors.cardanoStakePools.selectPoolDetails({
          cardanoStakePools: stakePools,
        }),
      ).toEqual({ [mainnetId]: { [poolId]: pool } });
    });

    it('selectActiveNetworkData picks the active Cardano network (mainnet)', () => {
      const data = makeNetworkData(9);
      const stakePools = cardanoStakePoolsReducers.cardanoStakePools(
        initialState,
        actions.cardanoStakePools.setNetworkData({
          network: mainnetId,
          data,
        }),
      );
      const selected =
        cardanoStakePoolsSelectors.cardanoStakePools.selectActiveNetworkData(
          rootState(stakePools, 'mainnet'),
        );
      expect(selected).toEqual(data);
    });

    it('selectActiveNetworkData picks testnet when networkType is testnet', () => {
      const mainnetData = makeNetworkData(1);
      const testnetData = makeNetworkData(2);
      let stakePools = cardanoStakePoolsReducers.cardanoStakePools(
        initialState,
        actions.cardanoStakePools.setNetworkData({
          network: mainnetId,
          data: mainnetData,
        }),
      );
      stakePools = cardanoStakePoolsReducers.cardanoStakePools(
        stakePools,
        actions.cardanoStakePools.setNetworkData({
          network: preprodId,
          data: testnetData,
        }),
      );
      const selected =
        cardanoStakePoolsSelectors.cardanoStakePools.selectActiveNetworkData(
          rootState(stakePools, 'testnet'),
        );
      expect(selected).toEqual(testnetData);
    });

    it('selectActivePoolDetails returns pools for the active network', () => {
      const pool = makeStakePool();
      const stakePools = cardanoStakePoolsReducers.cardanoStakePools(
        initialState,
        actions.cardanoStakePools.setPoolDetails({ network: mainnetId, pool }),
      );
      const selected =
        cardanoStakePoolsSelectors.cardanoStakePools.selectActivePoolDetails(
          rootState(stakePools, 'mainnet'),
        );
      expect(selected).toEqual({ [poolId]: pool });
    });

    it('selectActiveNetworkData is undefined when network id is missing from map', () => {
      const stakePools = initialState;
      const selected =
        cardanoStakePoolsSelectors.cardanoStakePools.selectActiveNetworkData(
          rootState(stakePools, 'mainnet'),
        );
      expect(selected).toBeUndefined();
    });
  });
});

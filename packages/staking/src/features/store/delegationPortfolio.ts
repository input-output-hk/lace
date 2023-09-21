import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  DelegationPortfolioState,
  DraftPortfolioStakePool,
  OldDelegationPortfolioStore,
  PortfolioManagementProcess,
} from './types';

const defaultState: DelegationPortfolioState = {
  activeManagementProcess: PortfolioManagementProcess.None,
  currentPortfolio: [],
  draftPortfolio: [],
  selections: [],
};

const MAX_POOLS_COUNT = 5;
const LAST_STABLE_EPOCH = 2;
// interchangeable with percentages
const targetWeight = 100;

const mapPoolWeights = (pools: DraftPortfolioStakePool[]) =>
  pools.map<DraftPortfolioStakePool>((pool) => ({ ...pool, weight: Math.round(targetWeight / pools.length) }));

export const useDelegationPortfolioStore = create(
  immer<OldDelegationPortfolioStore>((set, get) => ({
    ...defaultState,
    mutators: {
      beginManagementProcess: (process) =>
        set((store) => {
          if (store.activeManagementProcess === process) return;
          store.activeManagementProcess = process;
          store.draftPortfolio =
            process === PortfolioManagementProcess.CurrentPortfolio ? store.currentPortfolio : store.selections;
        }),
      // eslint-disable-next-line unicorn/no-object-as-default-parameter
      cancelManagementProcess: ({ dumpDraftToSelections } = { dumpDraftToSelections: false }) =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          if (dumpDraftToSelections) {
            store.selections = mapPoolWeights(store.draftPortfolio);
          }
          store.draftPortfolio = [];
          store.activeManagementProcess = PortfolioManagementProcess.None;
        }),
      clearSelections: () =>
        set((store) => {
          store.selections = [];
        }),
      finalizeManagementProcess: () =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          store.draftPortfolio = [];
          if (store.activeManagementProcess === PortfolioManagementProcess.NewPortfolio) {
            store.selections = [];
          }
          store.activeManagementProcess = PortfolioManagementProcess.None;
        }),
      removePoolInManagementProcess: ({ id }) =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          store.draftPortfolio = mapPoolWeights(store.draftPortfolio.filter((pool) => pool.id !== id));
          if (store.activeManagementProcess === PortfolioManagementProcess.NewPortfolio) {
            store.selections = store.draftPortfolio;
          }
        }),
      selectPool: (poolData) =>
        set((store) => {
          const { selectionsFull } = get().queries;
          const alreadySelected = store.selections.some(({ id }) => poolData.id === id);
          if (selectionsFull() || alreadySelected) return;
          store.selections.push(poolData);
          store.selections = mapPoolWeights(store.selections);
        }),
      setCurrentPortfolio: async ({ cardanoCoin, delegationDistribution, delegationRewardsHistory, currentEpoch }) => {
        const lastNonVolatileEpoch = currentEpoch.epochNo.valueOf() - LAST_STABLE_EPOCH;
        const confirmedRewardHistory = delegationRewardsHistory.all.filter(
          ({ epoch }) => epoch.valueOf() <= lastNonVolatileEpoch
        );
        const currentPortfolio = delegationDistribution.map(({ pool: stakePool, percentage, stake }) => {
          const confirmedPoolRewards = confirmedRewardHistory
            .filter(({ poolId }) => poolId === stakePool.id)
            .map(({ rewards }) => rewards);

          return {
            displayData: {
              ...Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool }),
              lastReward: confirmedPoolRewards[confirmedPoolRewards.length - 1] || BigInt(0),
              totalRewards: Wallet.BigIntMath.sum(confirmedPoolRewards),
            },
            id: stakePool.hexId,
            name: stakePool.metadata?.name,
            stakePool,
            ticker: stakePool.metadata?.ticker,
            value: stake,
            weight: Math.round(percentage * targetWeight),
          };
        });

        set((store) => {
          store.currentPortfolio = currentPortfolio;
        });
      },
      unselectPool: ({ id }) =>
        set((store) => {
          store.selections = mapPoolWeights(store.selections.filter((pool) => pool.id !== id));
        }),
    },
    queries: {
      isPoolSelected: (hexId) => {
        const { selections } = get();
        return !!selections?.find((pool) => pool.id === hexId);
      },
      selectionsFull: () => {
        const { selections } = get();
        return selections.length === MAX_POOLS_COUNT;
      },
    },
  }))
);

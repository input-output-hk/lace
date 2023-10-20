import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CARDANO_COIN_SYMBOL, LAST_STABLE_EPOCH } from './constants';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import {
  Command,
  ExecuteCommand,
  Flow,
  Handler,
  processExpandedViewCases,
  processPopupViewCases,
} from './stateMachine';
import { normalizePercentages } from './stateMachine/normalizePercentages';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  activeDrawerStep: undefined,
  activeFlow: Flow.Overview,
  cardanoCoinSymbol: 'ADA',
  currentPortfolio: [],
  draftPortfolio: undefined,
  pendingSelectedPortfolio: undefined,
  selectedPortfolio: [],
  view: undefined,
  viewedStakePool: undefined,
};

export const useDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set, get) => ({
    ...defaultState,
    mutators: {
      executeCommand: (command) => {
        let numberOfRecursiveCalls = 0;
        const callsConsideredAnInfiniteLoop = 10;
        let paramsStack: Command[] = [command];

        const { view } = get();
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let processCommand: Handler = () => {
          throw new Error('DelegationPortfolioStore: view not set');
        };
        if (view === 'popup') {
          processCommand = processPopupViewCases;
        }
        if (view === 'expanded') {
          processCommand = processExpandedViewCases;
        }

        set((state) => {
          // TODO: decide whether to throw this function away
          //  as we may not want to execute command from inside the SM
          const executeCommand: ExecuteCommand = (childCommand) => {
            paramsStack = [...paramsStack, childCommand];
            numberOfRecursiveCalls += 1;
            if (numberOfRecursiveCalls > callsConsideredAnInfiniteLoop) {
              const error = new Error('DelegationPortfolioStore: Infinite loop detected');
              throw Object.assign(error, { paramsStack });
            }
            // eslint-disable-next-line sonarjs/no-extra-arguments
            return processCommand({
              command: childCommand,
              executeCommand,
              state,
            });
          };

          // eslint-disable-next-line sonarjs/no-extra-arguments
          return processCommand({ command, executeCommand, state });
        });
      },
      forceAbortFlows: () =>
        set((state) => {
          const viewingOverviewPage = [Flow.Overview, Flow.CurrentPoolDetails, Flow.PortfolioManagement].includes(
            state.activeFlow
          );
          state.activeFlow = viewingOverviewPage ? Flow.Overview : Flow.BrowsePools;
          state.activeDrawerStep = undefined;
          state.selectedPortfolio = [];
          state.pendingSelectedPortfolio = undefined;
          state.viewedStakePool = undefined;
        }),
      setCardanoCoinSymbol: (currentChain) =>
        set((state) => {
          state.cardanoCoinSymbol = CARDANO_COIN_SYMBOL[currentChain.networkId];
        }),
      setCurrentPortfolio: async ({ currentEpoch, delegationDistribution, delegationRewardsHistory }) => {
        const lastNonVolatileEpoch = currentEpoch.epochNo.valueOf() - LAST_STABLE_EPOCH;
        const confirmedRewardHistory = delegationRewardsHistory.all.filter(
          ({ epoch }) => epoch.valueOf() <= lastNonVolatileEpoch
        );

        // TMP: replace by real data from memory/cip
        const savedPercentages = normalizePercentages(
          // eslint-disable-next-line no-magic-numbers
          delegationDistribution.map((item) => ({ ...item, percentage: item.percentage * 100 })),
          'percentage'
          // eslint-disable-next-line unicorn/no-array-reduce
        ).reduce((acc, item) => {
          acc[item.pool.hexId] = item.percentage;
          return acc;
        }, {} as Record<Wallet.Cardano.PoolIdHex, number>);

        const currentPortfolio = delegationDistribution.map(({ pool: stakePool, percentage, stake }) => {
          const confirmedPoolRewards = confirmedRewardHistory
            .filter(({ poolId }) => poolId === stakePool.id)
            .map(({ rewards }) => rewards);

          return {
            displayData: {
              ...mapStakePoolToDisplayData({ cardanoCoinSymbol: get().cardanoCoinSymbol, stakePool }),
              lastReward: confirmedPoolRewards[confirmedPoolRewards.length - 1] || BigInt(0),
              totalRewards: Wallet.BigIntMath.sum(confirmedPoolRewards),
            },
            id: stakePool.hexId,
            // eslint-disable-next-line no-magic-numbers
            onChainPercentage: percentage * 100,
            savedIntegerPercentage: savedPercentages[stakePool.hexId] || 0,
            sliderIntegerPercentage: savedPercentages[stakePool.hexId],
            stakePool,
            value: stake,
          };
        });

        set((state) => {
          state.currentPortfolio = currentPortfolio;
        });
      },
      setView: (view) =>
        set((state) => {
          state.view = view;
        }),
    },
  }))
);

import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CARDANO_COIN_SYMBOL, LAST_STABLE_EPOCH, PERCENTAGE_SCALE_MAX } from './constants';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import {
  Command,
  DelegationFlow,
  ExecuteCommand,
  Handler,
  processExpandedViewCases,
  processPopupViewCases,
  sumPercentagesSanitized,
} from './stateMachine';
import { normalizePercentages } from './stateMachine/normalizePercentages';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  activeDelegationFlow: DelegationFlow.Overview,
  activeDrawerStep: undefined,
  cardanoCoinSymbol: 'ADA',
  currentPortfolio: [],
  draftPortfolio: undefined,
  pendingSelectedPortfolio: undefined,
  selectedPortfolio: [],
  view: undefined,
  viewedStakePool: undefined,
};

// If percentages add up to 100, normalize them. Otherwise, round them to N decimal places.
// The latter occurs when there are funds on non-delegated addresses.
const sanitizeOnchainPercentages = <K extends string, T extends { [key in K]: number }>({
  items,
  key,
  decimals = 0,
}: {
  items: T[];
  key: K;
  decimals?: number;
}) =>
  sumPercentagesSanitized({ items, key }) === PERCENTAGE_SCALE_MAX
    ? normalizePercentages({
        decimals,
        items,
        key,
      })
    : items.map((item) => ({
        ...item,
        [key]: Number(item[key].toFixed(decimals)),
      }));

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
          const viewingOverviewPage = [
            DelegationFlow.Overview,
            DelegationFlow.CurrentPoolDetails,
            DelegationFlow.PortfolioManagement,
          ].includes(state.activeDelegationFlow);
          state.activeDelegationFlow = viewingOverviewPage ? DelegationFlow.Overview : DelegationFlow.BrowsePools;
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
        const savedPercentages = sanitizeOnchainPercentages({
          decimals: 0,
          items: delegationDistribution.map((item) => ({
            ...item,
            percentage: item.percentage * PERCENTAGE_SCALE_MAX,
          })),
          key: 'percentage',
        })
          // eslint-disable-next-line unicorn/no-array-reduce
          .reduce((acc, item) => {
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
            onChainPercentage: percentage * PERCENTAGE_SCALE_MAX,
            savedIntegerPercentage: savedPercentages[stakePool.hexId] || 0,
            sliderIntegerPercentage: savedPercentages[stakePool.hexId],
            stakePool,
            value: stake,
          };
        });

        set((state) => {
          state.currentPortfolio = sanitizeOnchainPercentages({
            decimals: 2,
            items: currentPortfolio,
            key: 'onChainPercentage',
          });
        });
      },
      setView: (view) =>
        set((state) => {
          state.view = view;
        }),
    },
  }))
);

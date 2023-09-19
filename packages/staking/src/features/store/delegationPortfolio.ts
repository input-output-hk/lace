import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useOutsideHandles } from '../outside-handles-provider';
import { DelegationPortfolioState, DelegationPortfolioStore, PortfolioManagementProcess, Sections } from './types';

type SectionState = {
  currentSection: Sections;
  nextSection?: Sections;
  prevSection?: Sections;
  allowSkipToFail?: boolean; // TODO apply and verify
};

type SectionsConfig = Record<Sections, SectionState>;

const drawerSectionsConfig = (isHwWallet: boolean): SectionsConfig =>
  ({
    [Sections.DETAIL]: {
      currentSection: Sections.DETAIL,
    },
    [Sections.PREFERENCES]: {
      currentSection: Sections.PREFERENCES,
      nextSection: Sections.CONFIRMATION,
      prevSection: Sections.DETAIL,
    },
    [Sections.CONFIRMATION]: {
      currentSection: Sections.CONFIRMATION,
      nextSection: isHwWallet ? Sections.SUCCESS_TX : Sections.SIGN,
      prevSection: Sections.PREFERENCES,
    },
    [Sections.SIGN]: {
      currentSection: Sections.SIGN,
      nextSection: Sections.SUCCESS_TX,
      prevSection: Sections.CONFIRMATION,
    },
    [Sections.SUCCESS_TX]: {
      currentSection: Sections.SUCCESS_TX,
      prevSection: isHwWallet ? Sections.CONFIRMATION : Sections.SIGN,
    },
    [Sections.FAIL_TX]: {
      currentSection: Sections.FAIL_TX,
      nextSection: Sections.SUCCESS_TX, // Only if re-try works
      prevSection: Sections.SIGN,
    },
  } as const);

const defaultState: DelegationPortfolioState = {
  activeManagementProcess: PortfolioManagementProcess.None,
  currentPortfolio: [],
  draftPortfolio: [],
  drawerVisible: false,
  // TODO: set this with keyAgentType
  isHwWallet: false,
  selections: [],
};

export const MAX_POOLS_COUNT = 5;
const LAST_STABLE_EPOCH = 2;

export const useDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set, get) => {
  const { walletStoreGetKeyAgentType: getKeyAgentType } = useOutsideHandles();
  return {
    ...defaultState,
    isHwWallet: getKeyAgentType() !== Wallet.KeyManagement.KeyAgentType.InMemory,
    mutators: {
      beginManagementProcess: (process) =>
        set((store) => {
          if (store.activeManagementProcess !== PortfolioManagementProcess.None) return;
          store.activeManagementProcess = process;
          if (process === PortfolioManagementProcess.CurrentPortfolio) {
            store.draftPortfolio = store.currentPortfolio;
          }
          if (process === PortfolioManagementProcess.NewPortfolio) {
            store.draftPortfolio = store.selections;
          }
          store.drawerVisible = true;
          store.drawerSectionConfig = drawerSectionsConfig(store.isHwWallet)[Sections.PREFERENCES];
        }),
      cancelManagementProcess: ({ dumpDraftToSelections } = { dumpDraftToSelections: false }) =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          if (dumpDraftToSelections) {
            store.selections = store.draftPortfolio.map((pool) => ({
              ...pool,
              weight: 1,
            }));
          }
          // extract, since duplicated with transition's code
          store.drawerVisible = false;
          store.drawerSectionConfig = undefined;
          store.draftPortfolio = [];
          store.activeManagementProcess = PortfolioManagementProcess.None;
        }),
      clearSelections: () =>
        set((store) => {
          store.selections = [];
        }),
      // tech dept
      removePoolInManagementProcess: ({ id }) =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          store.draftPortfolio = store.draftPortfolio.filter((pool) => pool.id !== id);
          if (store.activeManagementProcess === PortfolioManagementProcess.NewPortfolio) {
            store.selections = store.draftPortfolio;
          }
        }),
      selectPool: (poolData) =>
        set(({ selections }) => {
          const { selectionsFull } = get().queries;
          const alreadySelected = selections.some(({ id }) => poolData.id === id);
          if (selectionsFull() || alreadySelected) return;
          selections.push(poolData);
        }),
      setCurrentPortfolio: async ({
        cardanoCoin,
        delegationDistribution,
        delegationRewardsHistory,
        currentEpoch,
      }) => {
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
            weight: percentage,
          };
        });

        set((store) => {
          store.currentPortfolio = currentPortfolio;
        });
      },
      // eslint-disable-next-line sonarjs/cognitive-complexity
      transition: (action) => {
        const { activeManagementProcess, drawerVisible, drawerSectionConfig, isHwWallet } = get();
        if (activeManagementProcess === PortfolioManagementProcess.None) return;
        if (!drawerVisible) {
          console.error('INVALID MANAGEMENT STATE: expected drawer to be visible');
          return;
        }

        const { nextSection, prevSection } = drawerSectionConfig;

        if (action === 'error') {
          set((store) => {
            store.drawerSectionConfig = drawerSectionsConfig(isHwWallet)[Sections.FAIL_TX];
          });
          return;
        }

        const targetSection = action === 'next' ? nextSection : prevSection;

        set((store) => {
          if (!targetSection) {
            store.drawerVisible = false;
            store.drawerSectionConfig = undefined;
            store.draftPortfolio = [];
            store.activeManagementProcess = PortfolioManagementProcess.None;
            return;
          }
          if (action === 'next' && targetSection === Sections.SUCCESS_TX) {
            store.draftPortfolio = [];
            if (store.activeManagementProcess === PortfolioManagementProcess.NewPortfolio) {
              store.selections = [];
            }
          }
          store.drawerSectionConfig = drawerSectionsConfig(isHwWallet)[targetSection];
        });
      },
      unselectPool: ({ id }) =>
        set((store) => {
          store.selections = store.selections.filter((pool) => pool.id !== id);
        }),
    },
    queries: {
      // rework
      isDrawerVisible: () => {
        const { activeManagementProcess } = get();
        return activeManagementProcess !== PortfolioManagementProcess.None;
      },
      isPoolSelected: (hexId) => {
        const { selections } = get();
        return !!selections?.find((pool) => pool.id === hexId);
      },
      selectionsFull: () => {
        const { selections } = get();
        return selections.length === MAX_POOLS_COUNT;
      },
    },
  };
})
);

import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import { AdaSymbol, CurrentPortfolioStakePool, DraftPortfolioStakePool } from './types';

export const MAX_POOLS_COUNT = 5;
const LAST_STABLE_EPOCH = 2;

export const CARDANO_COIN_SYMBOL: Record<Wallet.Cardano.NetworkId, AdaSymbol> = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'ADA',
  [Wallet.Cardano.NetworkId.Testnet]: 'tADA',
};

export enum Flow {
  Overview = 'Overview',
  BrowsePools = 'BrowsePools',
  CurrentPoolDetails = 'CurrentPoolDetails',
  PoolDetails = 'PoolDetails',
  CurrentPortfolioManagement = 'CurrentPortfolioManagement',
  ChangingPreferencesConfirmation = 'ChangingPreferencesConfirmation',
  NewPortfolioCreation = 'NewPortfolioCreation',
}

export enum DrawerDefaultStep {
  PoolDetails = 'PoolDetails',
}

export enum DrawerManagementStep {
  Preferences = 'Preferences',
  Confirmation = 'Confirmation',
  Sign = 'Sign',
  Success = 'Success',
  Failure = 'Failure',
}

export type DrawerStep = DrawerDefaultStep | DrawerManagementStep;

type CommandCommonCancelDrawer = {
  type: 'CommandCommonCancelDrawer';
};

type CommandCommonDrawerBack = {
  type: 'CommandCommonDrawerBack';
};

type CommandCommonDrawerContinue = {
  type: 'CommandCommonDrawerContinue';
};

type CommandCommonPreferencesStepUpdateWeight = {
  type: 'CommandCommonPreferencesStepUpdateWeight';
  data: {
    poolId: Wallet.Cardano.PoolIdHex;
    weight: number;
  };
};

type CommandCommonPreferencesStepAddStakePools = {
  type: 'CommandCommonPreferencesStepAddStakePools';
};

type CommandCommonPreferencesStepRemoveStakePool = {
  type: 'CommandCommonPreferencesStepRemoveStakePool';
  data: Wallet.Cardano.PoolIdHex;
};

type CommandOverviewShowDetails = {
  type: 'CommandOverviewShowDetails';
  data: StakePoolWithLogo;
};

type CommandOverviewManagePortfolio = {
  type: 'CommandOverviewManagePortfolio';
};

type CommandOverviewGoToBrowsePools = {
  type: 'CommandOverviewGoToBrowsePools';
};

type CommandBrowsePoolsGoToOverview = {
  type: 'CommandBrowsePoolsGoToOverview';
};

type CommandBrowsePoolsSelectPool = {
  type: 'CommandBrowsePoolsSelectPool';
  data: Wallet.Cardano.StakePool;
};

type CommandBrowsePoolsUnselectPool = {
  type: 'CommandBrowsePoolsUnselectPool';
  data: Wallet.Cardano.PoolIdHex;
};

type CommandBrowsePoolsClearSelections = {
  type: 'CommandBrowsePoolsClearSelections';
};

type CommandBrowsePoolsCreateNewPortfolio = {
  type: 'CommandBrowsePoolsCreateNewPortfolio';
};

type CommandBrowsePoolsShowPoolDetails = {
  type: 'CommandBrowsePoolsShowPoolDetails';
  data: StakePoolWithLogo;
};

type CommandPoolDetailsSelectPool = {
  type: 'CommandPoolDetailsSelectPool';
  data: Wallet.Cardano.StakePool;
};

type CommandPoolDetailsUnselectPool = {
  type: 'CommandPoolDetailsUnselectPool';
  data: Wallet.Cardano.PoolIdHex;
};

type CommandPoolDetailsBeginSingleStaking = {
  type: 'CommandPoolDetailsBeginSingleStaking';
};

type CommandChangingPreferencesConfirmationConfirm = {
  type: 'CommandChangingPreferencesConfirmationConfirm';
};

type CommandChangingPreferencesConfirmationDiscard = {
  type: 'CommandChangingPreferencesConfirmationDiscard';
};

type OverviewCommand = CommandOverviewShowDetails | CommandOverviewManagePortfolio | CommandOverviewGoToBrowsePools;

type BrowsePoolsCommand =
  | CommandBrowsePoolsSelectPool
  | CommandBrowsePoolsUnselectPool
  | CommandBrowsePoolsShowPoolDetails
  | CommandBrowsePoolsGoToOverview
  | CommandBrowsePoolsClearSelections
  | CommandBrowsePoolsCreateNewPortfolio;

type CurrentPoolDetailsCommand = CommandCommonCancelDrawer;

type PoolDetailsCommand =
  | CommandCommonCancelDrawer
  | CommandPoolDetailsSelectPool
  | CommandPoolDetailsUnselectPool
  | CommandPoolDetailsBeginSingleStaking;

type CurrentPortfolioManagementStepPreferencesCommand =
  | CommandCommonCancelDrawer
  | CommandCommonDrawerContinue
  | CommandCommonPreferencesStepAddStakePools
  | CommandCommonPreferencesStepRemoveStakePool
  | CommandCommonPreferencesStepUpdateWeight;

type CurrentPortfolioManagementStepConfirmationCommand = CommandCommonDrawerBack | CommandCommonDrawerContinue;

type ChangingPreferencesConfirmationCommand =
  | CommandChangingPreferencesConfirmationDiscard
  | CommandChangingPreferencesConfirmationConfirm;

type NewPortfolioCreationStepPreferencesCommand =
  | CommandCommonCancelDrawer
  | CommandCommonDrawerContinue
  | CommandCommonPreferencesStepAddStakePools
  | CommandCommonPreferencesStepRemoveStakePool
  | CommandCommonPreferencesStepUpdateWeight;

type Command =
  | OverviewCommand
  | BrowsePoolsCommand
  | CurrentPoolDetailsCommand
  | PoolDetailsCommand
  | CurrentPortfolioManagementStepPreferencesCommand
  | CurrentPortfolioManagementStepConfirmationCommand
  | ChangingPreferencesConfirmationCommand
  | NewPortfolioCreationStepPreferencesCommand;

type StakePoolWithLogo = Wallet.Cardano.StakePool & { logo?: string };

type State = {
  activeDrawerStep?: DrawerStep;
  activeFlow: Flow;
  cardanoCoinSymbol: AdaSymbol;
  pendingSelectedPortfolio?: DraftPortfolioStakePool[];
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio?: DraftPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
  viewedStakePool?: StakePoolWithLogo;
};

type ExecuteCommand = <C extends Command>(command: C) => void;

export type DelegationPortfolioStore = State & {
  mutators: {
    executeCommand: ExecuteCommand;
    forceAbortFlows: () => void;
    setCardanoCoinSymbol: (currentChain: Wallet.Cardano.ChainId) => void;
    setCurrentPortfolio: (params: {
      delegationDistribution: DelegatedStake[];
      currentEpoch: Wallet.EpochInfo;
      delegationRewardsHistory: Wallet.RewardsHistory;
    }) => Promise<void>;
  };
};

// Handler type represents the function for particular state ([Mode.Overview]: Handler)
// It is returned by both: cases and handler
type Handler<C extends Command = any> = (params: {
  command: C;
  executeCommand: ExecuteCommand;
  store: DelegationPortfolioStore;
}) => void;

const cases =
  <T extends string>(definition: Record<T, Handler>, discriminator: T, parentName: string): Handler =>
  (params) => {
    const handler = definition[discriminator];
    if (!handler) {
      console.error(`Invalid discriminator ${discriminator} in ${parentName} handlers`);
      return;
    }
    handler(params);
  };

const handler =
  <C extends Command>(handlerBody: Handler<C>): Handler<C> =>
  (params) =>
    handlerBody(params);

const mapStakePoolToPortfolioPool = ({
  cardanoCoinSymbol,
  stakePool,
}: {
  cardanoCoinSymbol: AdaSymbol;
  stakePool: Wallet.Cardano.StakePool;
}) => ({
  displayData: mapStakePoolToDisplayData({ cardanoCoinSymbol, stakePool }),
  id: stakePool.hexId,
  name: stakePool.metadata?.name,
  ticker: stakePool.metadata?.ticker,
  weight: 1,
});

const targetWeight = 100;
const mapPoolWeights = (pools: DraftPortfolioStakePool[]) =>
  pools.map<DraftPortfolioStakePool>((pool) => ({ ...pool, weight: Math.round(targetWeight / pools.length) }));

const atomicStateMutators = {
  addPoolsFromPreferences: ({ store }: { store: DelegationPortfolioStore }) => {
    if (!store.draftPortfolio)
      throw new Error('Delegation Portfolio Store: Inconsistent state: lack of draftPortfolio');
    store.selectedPortfolio = mapPoolWeights(store.draftPortfolio);
    store.draftPortfolio = undefined;
    store.activeFlow = Flow.BrowsePools;
  },
  beginNewPortfolioCreation: ({
    selections,
    store,
  }: {
    selections: DraftPortfolioStakePool[];
    store: DelegationPortfolioStore;
  }) => {
    store.activeFlow = Flow.NewPortfolioCreation;
    store.activeDrawerStep = DrawerManagementStep.Preferences;
    store.draftPortfolio = selections;
  },
  cancelDrawer: ({
    store,
    targetFlow,
  }: {
    store: DelegationPortfolioStore;
    targetFlow: Flow.Overview | Flow.BrowsePools;
  }) => {
    store.activeFlow = targetFlow;
    store.activeDrawerStep = undefined;
  },
  removePoolFromPreferences: ({ id, store }: { id: Wallet.Cardano.PoolIdHex; store: DelegationPortfolioStore }) => {
    if (!store.draftPortfolio)
      throw new Error('Delegation Portfolio Store: Inconsistent state: lack of draftPortfolio');
    if (store.draftPortfolio.length === 1) return;
    store.draftPortfolio = mapPoolWeights(store.draftPortfolio.filter((pool) => pool.id !== id));
  },
  selectPool: ({ stakePool, store }: { stakePool: Wallet.Cardano.StakePool; store: DelegationPortfolioStore }) => {
    const selectionsFull = store.selectedPortfolio.length === MAX_POOLS_COUNT;
    const alreadySelected = store.selectedPortfolio.some(({ id }) => stakePool.hexId === id);
    if (selectionsFull || alreadySelected) return;
    store.selectedPortfolio.push(
      mapStakePoolToPortfolioPool({ cardanoCoinSymbol: store.cardanoCoinSymbol, stakePool })
    );
    store.selectedPortfolio = mapPoolWeights(store.selectedPortfolio);
  },
  showChangingPreferencesConfirmation: ({
    pendingSelectedPortfolio,
    store,
  }: {
    pendingSelectedPortfolio: DraftPortfolioStakePool[];
    store: DelegationPortfolioStore;
  }) => {
    store.activeFlow = Flow.ChangingPreferencesConfirmation;
    store.pendingSelectedPortfolio = pendingSelectedPortfolio;
    store.activeDrawerStep = undefined;
    store.viewedStakePool = undefined;
  },
  showPoolDetails: ({
    pool,
    store,
    targetFlow,
  }: {
    pool: StakePoolWithLogo;
    store: DelegationPortfolioStore;
    targetFlow: Flow.CurrentPoolDetails | Flow.PoolDetails;
  }) => {
    store.activeFlow = targetFlow;
    store.activeDrawerStep = DrawerDefaultStep.PoolDetails;
    store.viewedStakePool = pool;
  },
  unselectPool: ({ id, store }: { id: Wallet.Cardano.PoolIdHex; store: DelegationPortfolioStore }) => {
    store.selectedPortfolio = mapPoolWeights(store.selectedPortfolio.filter((pool) => pool.id !== id));
  },
  updatePoolWeight: ({
    poolId,
    store,
    weight,
  }: {
    store: DelegationPortfolioStore;
    poolId: Wallet.Cardano.PoolIdHex;
    weight: number;
  }) => {
    if (!store.draftPortfolio)
      throw new Error('Delegation Portfolio Store: Inconsistent state: lack of draftPortfolio');
    const pool = store.draftPortfolio.find(({ id }) => id === poolId);
    if (!pool) return;
    pool.weight = weight;
  },
};

const processCommand: Handler = (params) =>
  cases<Flow>(
    {
      [Flow.Overview]: cases<OverviewCommand['type']>(
        {
          CommandOverviewGoToBrowsePools: ({ store }) => {
            store.activeFlow = Flow.BrowsePools;
          },
          CommandOverviewManagePortfolio: ({ store }) => {
            store.activeFlow = Flow.CurrentPortfolioManagement;
            store.activeDrawerStep = DrawerManagementStep.Preferences;
            store.draftPortfolio = store.currentPortfolio;
          },
          CommandOverviewShowDetails: handler<CommandOverviewShowDetails>(({ store, command: { data } }) => {
            atomicStateMutators.showPoolDetails({ pool: data, store, targetFlow: Flow.CurrentPoolDetails });
          }),
        },
        params.command.type as OverviewCommand['type'],
        Flow.Overview
      ),
      [Flow.BrowsePools]: cases<BrowsePoolsCommand['type']>(
        {
          CommandBrowsePoolsClearSelections: ({ store }) => {
            store.selectedPortfolio = [];
          },
          CommandBrowsePoolsCreateNewPortfolio: ({ store }) => {
            if (store.currentPortfolio.length > 0) {
              atomicStateMutators.showChangingPreferencesConfirmation({
                pendingSelectedPortfolio: store.selectedPortfolio,
                store,
              });
            } else {
              atomicStateMutators.beginNewPortfolioCreation({ selections: store.selectedPortfolio, store });
            }
          },
          CommandBrowsePoolsGoToOverview: ({ store }) => {
            store.activeFlow = Flow.Overview;
          },
          CommandBrowsePoolsSelectPool: handler<CommandBrowsePoolsSelectPool>(({ store, command: { data } }) => {
            atomicStateMutators.selectPool({
              stakePool: data,
              store,
            });
          }),
          CommandBrowsePoolsShowPoolDetails: handler<CommandBrowsePoolsShowPoolDetails>(
            ({ store, command: { data } }) => {
              atomicStateMutators.showPoolDetails({ pool: data, store, targetFlow: Flow.PoolDetails });
            }
          ),
          CommandBrowsePoolsUnselectPool: handler<CommandBrowsePoolsUnselectPool>(({ store, command: { data } }) => {
            atomicStateMutators.unselectPool({ id: data, store });
          }),
        },
        params.command.type as BrowsePoolsCommand['type'],
        Flow.BrowsePools
      ),
      [Flow.CurrentPoolDetails]: cases<CurrentPoolDetailsCommand['type']>(
        {
          CommandCommonCancelDrawer: ({ store }) => {
            atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
            store.viewedStakePool = undefined;
          },
        },
        params.command.type as CurrentPoolDetailsCommand['type'],
        Flow.CurrentPoolDetails
      ),
      [Flow.PoolDetails]: cases<PoolDetailsCommand['type']>(
        {
          CommandCommonCancelDrawer: ({ store }) => {
            atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
            store.viewedStakePool = undefined;
          },
          CommandPoolDetailsBeginSingleStaking: ({ store }) => {
            if (!store.viewedStakePool) return;
            const portfolioPool = mapStakePoolToPortfolioPool({
              cardanoCoinSymbol: store.cardanoCoinSymbol,
              stakePool: store.viewedStakePool,
            });

            if (store.currentPortfolio.length > 0) {
              atomicStateMutators.showChangingPreferencesConfirmation({
                pendingSelectedPortfolio: [portfolioPool],
                store,
              });
            } else {
              atomicStateMutators.beginNewPortfolioCreation({ selections: [portfolioPool], store });
            }
          },
          CommandPoolDetailsSelectPool: handler<CommandPoolDetailsSelectPool>(
            ({ /* executeCommand,*/ store, command: { data } }) => {
              atomicStateMutators.selectPool({ stakePool: data, store });
              // ALT SOLUTION TBD:
              // executeCommand({ type: 'CommandCommonCancelDrawer' }})
              atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
              store.viewedStakePool = undefined;
            }
          ),
          CommandPoolDetailsUnselectPool: handler<CommandPoolDetailsUnselectPool>(
            ({ /* executeCommand,*/ store, command: { data } }) => {
              atomicStateMutators.unselectPool({ id: data, store });
              // ALT SOLUTION TBD:
              // executeCommand({ type: 'CommandCommonCancelDrawer' }})
              atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
              store.viewedStakePool = undefined;
            }
          ),
        },
        params.command.type as PoolDetailsCommand['type'],
        Flow.PoolDetails
      ),
      [Flow.CurrentPortfolioManagement]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<CurrentPortfolioManagementStepPreferencesCommand['type']>(
            {
              CommandCommonCancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
                store.draftPortfolio = undefined;
              },
              CommandCommonDrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              CommandCommonPreferencesStepAddStakePools: ({ store }) => {
                atomicStateMutators.addPoolsFromPreferences({ store });
              },
              CommandCommonPreferencesStepRemoveStakePool: handler<CommandCommonPreferencesStepRemoveStakePool>(
                ({ store, command: { data } }) => {
                  atomicStateMutators.removePoolFromPreferences({ id: data, store });
                }
              ),
              CommandCommonPreferencesStepUpdateWeight: handler<CommandCommonPreferencesStepUpdateWeight>(
                ({
                  store,
                  command: {
                    data: { poolId, weight },
                  },
                }) => {
                  atomicStateMutators.updatePoolWeight({ poolId, store, weight });
                }
              ),
            },
            params.command.type as CurrentPortfolioManagementStepPreferencesCommand['type'],
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: cases<CurrentPortfolioManagementStepConfirmationCommand['type']>(
            {
              CommandCommonDrawerBack: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Preferences;
              },
              CommandCommonDrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Sign;
              },
            },
            params.command.type as CurrentPortfolioManagementStepConfirmationCommand['type'],
            DrawerManagementStep.Confirmation
          ),
          [DrawerManagementStep.Sign]: () => void 0,
          [DrawerManagementStep.Success]: () => void 0,
          [DrawerManagementStep.Failure]: () => void 0,
        },
        params.store.activeDrawerStep as DrawerManagementStep,
        Flow.CurrentPortfolioManagement
      ),
      // TODO: reconsider this approach. Maybe it would be better to have just a boolean state for opening the modal
      //  instead of having a separate flow. It might feel more like a part of new portfolio creation step rather
      //  a separate flow.
      [Flow.ChangingPreferencesConfirmation]: cases<ChangingPreferencesConfirmationCommand['type']>(
        {
          CommandChangingPreferencesConfirmationConfirm: ({ store }) => {
            if (!store.pendingSelectedPortfolio) return;
            atomicStateMutators.beginNewPortfolioCreation({ selections: store.pendingSelectedPortfolio, store });
            store.pendingSelectedPortfolio = undefined;
          },
          CommandChangingPreferencesConfirmationDiscard: ({ store }) => {
            store.activeFlow = Flow.BrowsePools;
            store.pendingSelectedPortfolio = undefined;
          },
        },
        params.command.type as ChangingPreferencesConfirmationCommand['type'],
        Flow.ChangingPreferencesConfirmation
      ),
      [Flow.NewPortfolioCreation]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<NewPortfolioCreationStepPreferencesCommand['type']>(
            {
              CommandCommonCancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
                store.draftPortfolio = undefined;
              },
              CommandCommonDrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              CommandCommonPreferencesStepAddStakePools: ({ store }) => {
                atomicStateMutators.addPoolsFromPreferences({ store });
              },
              CommandCommonPreferencesStepRemoveStakePool: handler<CommandCommonPreferencesStepRemoveStakePool>(
                ({ store, command: { data } }) => {
                  atomicStateMutators.removePoolFromPreferences({ id: data, store });
                }
              ),
              CommandCommonPreferencesStepUpdateWeight: handler<CommandCommonPreferencesStepUpdateWeight>(
                ({
                  store,
                  command: {
                    data: { poolId, weight },
                  },
                }) => {
                  atomicStateMutators.updatePoolWeight({ poolId, store, weight });
                }
              ),
            },
            params.command.type as NewPortfolioCreationStepPreferencesCommand['type'],
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: () => void 0,
          [DrawerManagementStep.Sign]: () => void 0,
          [DrawerManagementStep.Success]: () => void 0,
          [DrawerManagementStep.Failure]: () => void 0,
        },
        params.store.activeDrawerStep as DrawerManagementStep,
        Flow.NewPortfolioCreation
      ),
    },
    params.store.activeFlow,
    'root'
  )(params);

const defaultState: State = {
  activeDrawerStep: undefined,
  activeFlow: Flow.Overview,
  cardanoCoinSymbol: 'ADA',
  currentPortfolio: [],
  draftPortfolio: undefined,
  pendingSelectedPortfolio: undefined,
  selectedPortfolio: [],
  viewedStakePool: undefined,
};

export const useNewDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set, get) => ({
    ...defaultState,
    mutators: {
      executeCommand: (command) => {
        let numberOfRecursiveCalls = 0;
        const callsConsideredAnInfiniteLoop = 10;
        let paramsStack: Command[] = [command];

        set((store) => {
          const executeCommand: ExecuteCommand = (childCommand) => {
            paramsStack = [...paramsStack, childCommand];
            numberOfRecursiveCalls += 1;
            if (numberOfRecursiveCalls > callsConsideredAnInfiniteLoop) {
              const error = new Error('DelegationPortfolioStore: Infinite loop detected');
              throw Object.assign(error, { paramsStack });
            }
            processCommand({
              command: childCommand,
              executeCommand,
              store,
            });
          };

          processCommand({ command, executeCommand, store });
        });
      },
      forceAbortFlows: () =>
        set((store) => {
          const viewingOverviewPage = [
            Flow.Overview,
            Flow.CurrentPoolDetails,
            Flow.CurrentPortfolioManagement,
          ].includes(store.activeFlow);
          store.activeFlow = viewingOverviewPage ? Flow.Overview : Flow.BrowsePools;
          store.activeDrawerStep = undefined;
          store.selectedPortfolio = [];
          store.pendingSelectedPortfolio = undefined;
          store.viewedStakePool = undefined;
        }),
      setCardanoCoinSymbol: (currentChain) =>
        set((store) => {
          store.cardanoCoinSymbol = CARDANO_COIN_SYMBOL[currentChain.networkId];
        }),
      setCurrentPortfolio: async ({ currentEpoch, delegationDistribution, delegationRewardsHistory }) => {
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
              ...mapStakePoolToDisplayData({ cardanoCoinSymbol: get().cardanoCoinSymbol, stakePool }),
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
    },
  }))
);

export const isNewDrawerVisible = ({ activeFlow }: DelegationPortfolioStore) =>
  [Flow.CurrentPoolDetails, Flow.CurrentPortfolioManagement, Flow.NewPortfolioCreation, Flow.PoolDetails].includes(
    activeFlow
  );

// mappers

export type NewStakePoolDetails = {
  delegators?: number | string;
  description: string;
  hexId: string;
  id: string;
  logo?: string;
  margin: number | string;
  name: string;
  owners: string[];
  saturation?: number | string;
  stake: { number: string; unit?: string };
  ticker: string;
  apy?: number | string;
  status: Wallet.Cardano.StakePool['status'];
  fee: number | string;
  contact: Wallet.Cardano.PoolContactData;
};

export const stakePoolDetailsSelector = ({
  cardanoCoinSymbol,
  viewedStakePool,
}: DelegationPortfolioStore): NewStakePoolDetails | undefined => {
  if (!viewedStakePool) return undefined;
  // eslint-disable-next-line consistent-return
  return mapStakePoolToDisplayData({ cardanoCoinSymbol, stakePool: viewedStakePool });
};

export const isPoolSelectedSelector = (poolHexId: Wallet.Cardano.PoolIdHex) => (store: DelegationPortfolioStore) =>
  !!store.selectedPortfolio?.find((pool) => pool.id === poolHexId);

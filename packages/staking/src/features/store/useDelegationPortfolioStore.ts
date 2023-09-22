import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import { AdaSymbol } from './types';

export const MAX_POOLS_COUNT = 5;
const LAST_STABLE_EPOCH = 2;

export const CARDANO_COIN_SYMBOL: Record<Wallet.Cardano.NetworkId, AdaSymbol> = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'ADA',
  [Wallet.Cardano.NetworkId.Testnet]: 'tADA',
};

export type DraftPortfolioStakePool = Wallet.Cardano.Cip17Pool & {
  displayData: Wallet.util.StakePool;
};

export type CurrentPortfolioStakePool = DraftPortfolioStakePool & {
  displayData: Wallet.util.StakePool & {
    lastReward: bigint;
    totalRewards: bigint;
  };
  stakePool: Wallet.Cardano.StakePool;
  value: bigint;
};

export enum Flow {
  Overview = 'Overview',
  BrowsePools = 'BrowsePools',
  CurrentPoolDetails = 'CurrentPoolDetails',
  PoolDetails = 'PoolDetails',
  PortfolioManagement = 'PortfolioManagement',
  ChangingPreferences = 'ChangingPreferences',
  NewPortfolio = 'NewPortfolio',
}

type ExpandedViewFlow = Flow;

type PopupViewFLow = Flow.Overview | Flow.CurrentPoolDetails;

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

type CancelDrawer = {
  type: 'CancelDrawer';
};

type DrawerBack = {
  type: 'DrawerBack';
};

type DrawerContinue = {
  type: 'DrawerContinue';
};

type AddStakePools = {
  type: 'AddStakePools';
};

type RemoveStakePool = {
  type: 'RemoveStakePool';
  data: Wallet.Cardano.PoolIdHex;
};

type ShowDelegatedPoolDetails = {
  type: 'ShowDelegatedPoolDetails';
  data: StakePoolWithLogo;
};

type ManagePortfolio = {
  type: 'ManagePortfolio';
};

type GoToBrowsePools = {
  type: 'GoToBrowsePools';
};

type GoToOverview = {
  type: 'GoToOverview';
};

type SelectPoolFromList = {
  type: 'SelectPoolFromList';
  data: Wallet.Cardano.StakePool;
};

type UnselectPoolFromList = {
  type: 'UnselectPoolFromList';
  data: Wallet.Cardano.PoolIdHex;
};

type ClearSelections = {
  type: 'ClearSelections';
};

type CreateNewPortfolio = {
  type: 'CreateNewPortfolio';
};

type ShowPoolDetailsFromList = {
  type: 'ShowPoolDetailsFromList';
  data: StakePoolWithLogo;
};

type SelectPoolFromDetails = {
  type: 'SelectPoolFromDetails';
  data: Wallet.Cardano.StakePool;
};

type UnselectPoolFromDetails = {
  type: 'UnselectPoolFromDetails';
  data: Wallet.Cardano.PoolIdHex;
};

type BeginSingleStaking = {
  type: 'BeginSingleStaking';
};

type ConfirmChangingPreferences = {
  type: 'ConfirmChangingPreferences';
};

type DiscardChangingPreferences = {
  type: 'DiscardChangingPreferences';
};

type DrawerFailure = {
  type: 'DrawerFailure';
};

type OverviewCommand = ShowDelegatedPoolDetails | ManagePortfolio | GoToBrowsePools;

type BrowsePoolsCommand =
  | SelectPoolFromList
  | UnselectPoolFromList
  | ShowPoolDetailsFromList
  | GoToOverview
  | ClearSelections
  | CreateNewPortfolio;

type CurrentPoolDetailsCommand = CancelDrawer;

type PoolDetailsCommand = CancelDrawer | SelectPoolFromDetails | UnselectPoolFromDetails | BeginSingleStaking;

type PortfolioManagementPreferencesCommand = CancelDrawer | DrawerContinue | AddStakePools | RemoveStakePool;

type PortfolioManagementConfirmationCommand = CancelDrawer | DrawerContinue | DrawerBack;

type PortfolioManagementSignCommand = CancelDrawer | DrawerContinue | DrawerFailure | DrawerBack;

type PortfolioManagementFailureCommand = CancelDrawer | DrawerContinue | DrawerBack;

type PortfolioManagementSuccessCommand = CancelDrawer;

type ChangingPreferencesCommand = DiscardChangingPreferences | ConfirmChangingPreferences;

type NewPortfolioPreferencesCommand = CancelDrawer | DrawerContinue | AddStakePools | RemoveStakePool;

type NewPortfolioConfirmationCommand = CancelDrawer | DrawerContinue | DrawerBack;

type NewPortfolioSignCommand = CancelDrawer | DrawerContinue | DrawerFailure | DrawerBack;

type NewPortfolioFailureCommand = CancelDrawer | DrawerContinue;

type NewPortfolioSuccessCommand = CancelDrawer;

type Command =
  | OverviewCommand
  | BrowsePoolsCommand
  | CurrentPoolDetailsCommand
  | PoolDetailsCommand
  | PortfolioManagementPreferencesCommand
  | PortfolioManagementConfirmationCommand
  | PortfolioManagementSignCommand
  | PortfolioManagementFailureCommand
  | PortfolioManagementSuccessCommand
  | ChangingPreferencesCommand
  | NewPortfolioPreferencesCommand
  | NewPortfolioConfirmationCommand
  | NewPortfolioSignCommand
  | NewPortfolioFailureCommand
  | NewPortfolioSuccessCommand;

type PopupOverviewCommand = ShowDelegatedPoolDetails;

type PopupCurrentPoolDetailsCommand = CancelDrawer;

type StakePoolWithLogo = Wallet.Cardano.StakePool & { logo?: string };

type State = {
  activeDrawerStep?: DrawerStep;
  activeFlow: Flow;
  cardanoCoinSymbol: AdaSymbol;
  pendingSelectedPortfolio?: DraftPortfolioStakePool[];
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio?: DraftPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
  view?: 'popup' | 'expanded';
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
    setView: (view: 'popup' | 'expanded') => void;
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

const missingDraftPortfolioErrorMessage = 'DelegationPortfolioStore: Inconsistent state: missing draftPortfolio';

const atomicStateMutators = {
  addPoolsFromPreferences: ({ store }: { store: DelegationPortfolioStore }) => {
    if (!store.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
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
    store.activeFlow = Flow.NewPortfolio;
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
    if (!store.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
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
    store.activeFlow = Flow.ChangingPreferences;
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
};

const processPopupViewCases: Handler = (params) =>
  cases<PopupViewFLow>(
    {
      [Flow.Overview]: cases<PopupOverviewCommand['type']>(
        {
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails>(({ store, command: { data } }) => {
            atomicStateMutators.showPoolDetails({ pool: data, store, targetFlow: Flow.CurrentPoolDetails });
          }),
        },
        params.command.type,
        Flow.Overview
      ),
      [Flow.CurrentPoolDetails]: cases<PopupCurrentPoolDetailsCommand['type']>(
        {
          CancelDrawer: ({ store }) => {
            atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
            store.viewedStakePool = undefined;
          },
        },
        params.command.type,
        Flow.CurrentPoolDetails
      ),
    },
    params.store.activeFlow as PopupViewFLow,
    'root'
  )(params);

const processExpandedViewCases: Handler = (params) =>
  cases<ExpandedViewFlow>(
    {
      [Flow.Overview]: cases<OverviewCommand['type']>(
        {
          GoToBrowsePools: ({ store }) => {
            store.activeFlow = Flow.BrowsePools;
          },
          ManagePortfolio: ({ store }) => {
            store.activeFlow = Flow.PortfolioManagement;
            store.activeDrawerStep = DrawerManagementStep.Preferences;
            store.draftPortfolio = store.currentPortfolio;
          },
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails>(({ store, command: { data } }) => {
            atomicStateMutators.showPoolDetails({ pool: data, store, targetFlow: Flow.CurrentPoolDetails });
          }),
        },
        params.command.type as OverviewCommand['type'],
        Flow.Overview
      ),
      [Flow.BrowsePools]: cases<BrowsePoolsCommand['type']>(
        {
          ClearSelections: ({ store }) => {
            store.selectedPortfolio = [];
          },
          CreateNewPortfolio: ({ store }) => {
            if (store.currentPortfolio.length > 0) {
              atomicStateMutators.showChangingPreferencesConfirmation({
                pendingSelectedPortfolio: store.selectedPortfolio,
                store,
              });
            } else {
              atomicStateMutators.beginNewPortfolioCreation({ selections: store.selectedPortfolio, store });
            }
          },
          GoToOverview: ({ store }) => {
            store.activeFlow = Flow.Overview;
          },
          SelectPoolFromList: handler<SelectPoolFromList>(({ store, command: { data } }) => {
            atomicStateMutators.selectPool({
              stakePool: data,
              store,
            });
          }),
          ShowPoolDetailsFromList: handler<ShowPoolDetailsFromList>(({ store, command: { data } }) => {
            atomicStateMutators.showPoolDetails({ pool: data, store, targetFlow: Flow.PoolDetails });
          }),
          UnselectPoolFromList: handler<UnselectPoolFromList>(({ store, command: { data } }) => {
            atomicStateMutators.unselectPool({ id: data, store });
          }),
        },
        params.command.type as BrowsePoolsCommand['type'],
        Flow.BrowsePools
      ),
      [Flow.CurrentPoolDetails]: cases<CurrentPoolDetailsCommand['type']>(
        {
          CancelDrawer: ({ store }) => {
            atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
            store.viewedStakePool = undefined;
          },
        },
        params.command.type as CurrentPoolDetailsCommand['type'],
        Flow.CurrentPoolDetails
      ),
      [Flow.PoolDetails]: cases<PoolDetailsCommand['type']>(
        {
          BeginSingleStaking: ({ store }) => {
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
          CancelDrawer: ({ store }) => {
            atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
            store.viewedStakePool = undefined;
          },
          SelectPoolFromDetails: handler<SelectPoolFromDetails>(({ /* executeCommand,*/ store, command: { data } }) => {
            atomicStateMutators.selectPool({ stakePool: data, store });
            // ALT SOLUTION TBD:
            // executeCommand({ type: 'CancelDrawer' }})
            atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
            store.viewedStakePool = undefined;
          }),
          UnselectPoolFromDetails: handler<UnselectPoolFromDetails>(
            ({ /* executeCommand,*/ store, command: { data } }) => {
              atomicStateMutators.unselectPool({ id: data, store });
              // ALT SOLUTION TBD:
              // executeCommand({ type: 'CancelDrawer' }})
              atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
              store.viewedStakePool = undefined;
            }
          ),
        },
        params.command.type as PoolDetailsCommand['type'],
        Flow.PoolDetails
      ),
      [Flow.PortfolioManagement]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<PortfolioManagementPreferencesCommand['type']>(
            {
              AddStakePools: ({ store }) => {
                atomicStateMutators.addPoolsFromPreferences({ store });
              },
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
                store.draftPortfolio = undefined;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              RemoveStakePool: handler<RemoveStakePool>(({ store, command: { data } }) => {
                atomicStateMutators.removePoolFromPreferences({ id: data, store });
              }),
            },
            params.command.type as PortfolioManagementPreferencesCommand['type'],
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: cases<PortfolioManagementConfirmationCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
                store.draftPortfolio = undefined;
              },
              DrawerBack: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Preferences;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Sign;
              },
            },
            params.command.type as PortfolioManagementConfirmationCommand['type'],
            DrawerManagementStep.Confirmation
          ),
          [DrawerManagementStep.Sign]: cases<PortfolioManagementSignCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
                store.draftPortfolio = undefined;
              },
              DrawerBack: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Success;
              },
              DrawerFailure: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Failure;
              },
            },
            params.command.type as PortfolioManagementSignCommand['type'],
            DrawerManagementStep.Sign
          ),
          [DrawerManagementStep.Success]: cases<PortfolioManagementSuccessCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
                store.draftPortfolio = undefined;
              },
            },
            params.command.type as PortfolioManagementSuccessCommand['type'],
            DrawerManagementStep.Success
          ),
          [DrawerManagementStep.Failure]: cases<PortfolioManagementFailureCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
                store.draftPortfolio = undefined;
              },
              DrawerBack: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Sign;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Success;
              },
            },
            params.command.type as PortfolioManagementFailureCommand['type'],
            DrawerManagementStep.Failure
          ),
        },
        params.store.activeDrawerStep as DrawerManagementStep,
        Flow.PortfolioManagement
      ),
      // TODO: reconsider this approach. Maybe it would be better to have just a boolean state for opening the modal
      //  instead of having a separate flow. It might feel more like a part of new portfolio creation step rather
      //  a separate flow.
      [Flow.ChangingPreferences]: cases<ChangingPreferencesCommand['type']>(
        {
          ConfirmChangingPreferences: ({ store }) => {
            if (!store.pendingSelectedPortfolio) return;
            atomicStateMutators.beginNewPortfolioCreation({ selections: store.pendingSelectedPortfolio, store });
            store.pendingSelectedPortfolio = undefined;
          },
          DiscardChangingPreferences: ({ store }) => {
            store.activeFlow = Flow.BrowsePools;
            store.pendingSelectedPortfolio = undefined;
          },
        },
        params.command.type as ChangingPreferencesCommand['type'],
        Flow.ChangingPreferences
      ),
      [Flow.NewPortfolio]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<NewPortfolioPreferencesCommand['type']>(
            {
              AddStakePools: ({ store }) => {
                atomicStateMutators.addPoolsFromPreferences({ store });
              },
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
                store.draftPortfolio = undefined;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              RemoveStakePool: handler<RemoveStakePool>(({ store, command: { data } }) => {
                atomicStateMutators.removePoolFromPreferences({ id: data, store });
              }),
            },
            params.command.type as NewPortfolioPreferencesCommand['type'],
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: cases<NewPortfolioConfirmationCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
                store.draftPortfolio = undefined;
              },
              DrawerBack: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Preferences;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Sign;
              },
            },
            params.command.type as NewPortfolioConfirmationCommand['type'],
            DrawerManagementStep.Confirmation
          ),
          [DrawerManagementStep.Sign]: cases<NewPortfolioSignCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
                store.draftPortfolio = undefined;
              },
              DrawerBack: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Success;
              },
              DrawerFailure: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Failure;
              },
            },
            params.command.type as NewPortfolioSignCommand['type'],
            DrawerManagementStep.Sign
          ),
          [DrawerManagementStep.Success]: cases<NewPortfolioSuccessCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
                store.draftPortfolio = undefined;
                store.selectedPortfolio = []; // NewPortfolio-specific
              },
            },
            params.command.type as NewPortfolioSuccessCommand['type'],
            DrawerManagementStep.Success
          ),
          [DrawerManagementStep.Failure]: cases<NewPortfolioFailureCommand['type']>(
            {
              CancelDrawer: ({ store }) => {
                atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.BrowsePools });
                store.draftPortfolio = undefined;
              },
              DrawerContinue: ({ store }) => {
                store.activeDrawerStep = DrawerManagementStep.Success;
              },
            },
            params.command.type as NewPortfolioFailureCommand['type'],
            DrawerManagementStep.Failure
          ),
        },
        params.store.activeDrawerStep as DrawerManagementStep,
        Flow.NewPortfolio
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

        set((store) => {
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
            processCommand({
              command: childCommand,
              executeCommand,
              store,
            });
          };

          // eslint-disable-next-line sonarjs/no-extra-arguments
          processCommand({ command, executeCommand, store });
        });
      },
      forceAbortFlows: () =>
        set((store) => {
          const viewingOverviewPage = [Flow.Overview, Flow.CurrentPoolDetails, Flow.PortfolioManagement].includes(
            store.activeFlow
          );
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
      setView: (view) =>
        set((store) => {
          store.view = view;
        }),
    },
  }))
);

export const isDrawerVisible = ({ activeFlow }: DelegationPortfolioStore) =>
  [Flow.CurrentPoolDetails, Flow.PortfolioManagement, Flow.NewPortfolio, Flow.PoolDetails].includes(activeFlow);

export type StakePoolDetails = {
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
}: DelegationPortfolioStore): StakePoolDetails | undefined => {
  if (!viewedStakePool) return undefined;
  // eslint-disable-next-line consistent-return
  return mapStakePoolToDisplayData({ cardanoCoinSymbol, stakePool: viewedStakePool });
};

export const isPoolSelectedSelector = (poolHexId: Wallet.Cardano.PoolIdHex) => (store: DelegationPortfolioStore) =>
  !!store.selectedPortfolio?.find((pool) => pool.id === poolHexId);

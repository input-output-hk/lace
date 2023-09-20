import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { formatPercentages, getNumberWithUnit, getRandomIcon } from '@lace/common';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAX_POOLS_COUNT } from './delegationPortfolio';
import { CurrentPortfolioStakePool, DraftPortfolioStakePool } from './types';

export enum Flow {
  Overview = 'Overview',
  BrowsePools = 'BrowsePools',
  CurrentPoolDetails = 'CurrentPoolDetails',
  PoolDetails = 'PoolDetails',
  CurrentPortfolioManagement = 'CurrentPortfolioManagement',
  NewPortfolioCreation = 'NewPortfolioCreation',
}

enum DrawerDefaultStep {
  PoolDetails = 'PoolDetails',
}

enum DrawerManagementStep {
  Preferences = 'Preferences',
  Confirmation = 'Confirmation',
  Sign = 'Sign',
  Success = 'Success',
  Failure = 'Failure',
}

type DrawerStep = DrawerDefaultStep | DrawerManagementStep;

type CommandCommonCancelDrawer = {
  type: 'CommandCommonCancelDrawer';
};

type CommandCommonPreferencesStepUpdateWeight = {
  type: 'CommandCommonPreferencesStepUpdateWeight';
  data: {
    poolId: Wallet.Cardano.PoolIdHex;
    weight: number;
  };
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
  data: DraftPortfolioStakePool;
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
  data: DraftPortfolioStakePool;
};

type CommandPoolDetailsUnselectPool = {
  type: 'CommandPoolDetailsUnselectPool';
  data: Wallet.Cardano.PoolIdHex;
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

type PoolDetailsCommand = CommandCommonCancelDrawer | CommandPoolDetailsSelectPool | CommandPoolDetailsUnselectPool;

type CurrentPortfolioManagementStepPreferencesCommand =
  | CommandCommonCancelDrawer
  | CommandCommonPreferencesStepUpdateWeight;

type NewPortfolioCreationStepPreferencesCommand = CommandCommonCancelDrawer | CommandCommonPreferencesStepUpdateWeight;

type Command =
  | OverviewCommand
  | BrowsePoolsCommand
  | CurrentPoolDetailsCommand
  | PoolDetailsCommand
  | CurrentPortfolioManagementStepPreferencesCommand
  | NewPortfolioCreationStepPreferencesCommand;

type StakePoolWithLogo = Wallet.Cardano.StakePool & { logo?: string };

type State = {
  activeDrawerStep?: DrawerStep;
  activeFlow: Flow;
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio: DraftPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
  viewedStakePool?: StakePoolWithLogo;
};

type ExecuteCommand = <C extends Command>(command: C) => void;

type DelegationPortfolioStore = State & {
  mutators: {
    executeCommand: ExecuteCommand;
    setCurrentPortfolio: (params: {
      delegationDistribution: DelegatedStake[];
      cardanoCoin: Wallet.CoinId;
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

const atomicStateMutators = {
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
  selectPool: ({ pool, store }: { pool: DraftPortfolioStakePool; store: DelegationPortfolioStore }) => {
    const selectionsFull = store.selectedPortfolio.length === MAX_POOLS_COUNT;
    const alreadySelected = store.selectedPortfolio.some(({ id }) => pool.id === id);
    if (selectionsFull || alreadySelected) return;
    store.selectedPortfolio.push(pool);
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
    store.selectedPortfolio = store.selectedPortfolio.filter((pool) => pool.id !== id);
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
            store.activeFlow = Flow.NewPortfolioCreation;
            store.activeDrawerStep = DrawerManagementStep.Preferences;
            store.draftPortfolio = store.selectedPortfolio;
          },
          CommandBrowsePoolsGoToOverview: ({ store }) => {
            store.activeFlow = Flow.Overview;
          },
          CommandBrowsePoolsSelectPool: handler<CommandBrowsePoolsSelectPool>(({ store, command: { data } }) => {
            atomicStateMutators.selectPool({ pool: data, store });
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
          CommandPoolDetailsSelectPool: handler<CommandPoolDetailsSelectPool>(
            ({ /* executeCommand,*/ store, command: { data } }) => {
              atomicStateMutators.selectPool({ pool: data, store });
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
                store.draftPortfolio = [];
              },
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
          [DrawerManagementStep.Confirmation]: () => void 0,
          [DrawerManagementStep.Sign]: () => void 0,
          [DrawerManagementStep.Success]: () => void 0,
          [DrawerManagementStep.Failure]: () => void 0,
        },
        params.store.activeDrawerStep as DrawerManagementStep,
        Flow.CurrentPortfolioManagement
      ),
      [Flow.NewPortfolioCreation]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: () =>
            cases<NewPortfolioCreationStepPreferencesCommand['type']>(
              {
                CommandCommonCancelDrawer: ({ store }) => {
                  atomicStateMutators.cancelDrawer({ store, targetFlow: Flow.Overview });
                  store.draftPortfolio = [];
                },
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
  currentPortfolio: [],
  draftPortfolio: [],
  selectedPortfolio: [],
  viewedStakePool: undefined,
};

export const useNewDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set) => ({
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
      setCurrentPortfolio: async () => {
        const currentPortfolioBasedOnArguments: CurrentPortfolioStakePool[] = [];

        set((store) => {
          store.currentPortfolio = currentPortfolioBasedOnArguments;
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
  viewedStakePool,
}: DelegationPortfolioStore): NewStakePoolDetails | undefined => {
  if (!viewedStakePool) return undefined;

  const {
    id,
    cost,
    hexId,
    metadata: { description = '', name = '', ticker = '', homepage, ext } = {},
    metrics,
    margin,
    owners,
    logo,
    status,
  } = viewedStakePool;
  const calcMargin = margin ? `${formatPercentages(margin.numerator / margin.denominator)}` : '-';

  // eslint-disable-next-line consistent-return
  return {
    apy: metrics?.apy && formatPercentages(metrics.apy),
    contact: {
      primary: homepage,
      ...ext?.pool.contact,
    },
    // TODO: a lot of this is repeated in `stakePoolTransformer`. Have only one place to parse this info
    delegators: metrics?.delegators,
    description,
    fee: Wallet.util.lovelacesToAdaString(cost.toString()),
    hexId: hexId.toString(),
    id: id.toString(),
    logo: logo ?? getRandomIcon({ id: id.toString(), size: 30 }),
    margin: calcMargin,
    name,
    owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
    saturation: metrics?.saturation && formatPercentages(metrics.saturation),
    stake: metrics?.stake?.active
      ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(metrics.stake?.active?.toString()))
      : { number: '-' },
    status,
    ticker,
  };
};

export const isPoolSelectedSelector = (poolHexId: Wallet.Cardano.PoolIdHex) => (store: DelegationPortfolioStore) =>
  !!store.selectedPortfolio?.find((pool) => pool.id === poolHexId);

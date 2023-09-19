import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAX_POOLS_COUNT } from './delegationPortfolio';
import { CurrentPortfolioStakePool, DraftPortfolioStakePool } from './types';

enum Flow {
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

interface CommandObject {
  type: string;
}
interface CommandObject {
  type: string;
  data: unknown;
}

type CommandOverviewShowDetails = CommandObject & {
  type: 'CommandOverviewShowDetails';
  data: Wallet.Cardano.StakePool;
};

type CommandOverviewManagePortfolio = CommandObject & {
  type: 'CommandOverviewManagePortfolio';
};

type CommandOverviewGoToBrowsePools = CommandObject & {
  type: 'CommandOverviewGoToBrowsePools';
};

type CommandBrowsePoolsSelectPool = CommandObject & {
  type: 'CommandBrowsePoolsSelectPool';
  data: DraftPortfolioStakePool;
};

type CommandBrowsePoolsShowPoolDetails = CommandObject & {
  type: 'CommandBrowsePoolsShowPoolDetails';
  data: Wallet.Cardano.StakePool;
};

type CommandPoolDetailsSelectPool = CommandObject & {
  type: 'CommandPoolDetailsSelectPool';
  data: DraftPortfolioStakePool;
};

type CommandDrawerPreferencesUpdatePoolWeight = CommandObject & {
  type: 'CommandDrawerPreferencesUpdatePoolWeight';
  data: {
    poolId: Wallet.Cardano.PoolIdHex;
    weight: number;
  };
};

type OverviewCommand = CommandOverviewShowDetails | CommandOverviewManagePortfolio | CommandOverviewGoToBrowsePools;

type BrowsePoolsCommand = CommandBrowsePoolsSelectPool | CommandBrowsePoolsShowPoolDetails;

type PoolDetailsCommand = CommandPoolDetailsSelectPool;

type DrawerPreferencesCommand = CommandDrawerPreferencesUpdatePoolWeight;

type Command = OverviewCommand | BrowsePoolsCommand | PoolDetailsCommand | DrawerPreferencesCommand;

type State = {
  activeDrawerStep?: DrawerStep;
  activeFlow: Flow;
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio: DraftPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
  viewedStakePool?: Wallet.Cardano.StakePool;
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

// Called recursively.
// Cases function returns a handler which calls another handler from a nested cases function
/**
 * cases({
 *   [Mode.Overview]: cases({  // returns a handler called by upper cases
 *     [SomeNestedState]: cases({ // returns a handler called by upper cases
 *       [Command]: ({ state }) => { state modification }  // a handler function called by upper cases
 *     })
 *   })
 * })
 */
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

// Just a wrapper for a simple handler function but narrowing down the data type
// so we are able to hint TS that for a given command that is the type of passed data
const handler =
  <C extends Command>(handlerBody: Handler<C>): Handler<C> =>
  (params) =>
    handlerBody(params);

const helpers = {
  selectPool: ({ pool, store }: { pool: DraftPortfolioStakePool; store: DelegationPortfolioStore }) => {
    const selectionsFull = store.selectedPortfolio.length === MAX_POOLS_COUNT;
    const alreadySelected = store.selectedPortfolio.some(({ id }) => pool.id === id);
    if (selectionsFull || alreadySelected) return;
    store.selectedPortfolio.push(pool);
  },
  showPoolDetails: ({
    pool,
    store,
    targetMode,
  }: {
    pool: Wallet.Cardano.StakePool;
    store: DelegationPortfolioStore;
    targetMode: Flow;
  }) => {
    store.activeFlow = targetMode;
    store.activeDrawerStep = DrawerDefaultStep.PoolDetails;
    store.viewedStakePool = pool;
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
            helpers.showPoolDetails({ pool: data, store, targetMode: Flow.CurrentPoolDetails });
          }),
        },
        params.command.type as OverviewCommand['type'],
        Flow.Overview
      ),
      [Flow.BrowsePools]: cases<BrowsePoolsCommand['type']>(
        {
          CommandBrowsePoolsSelectPool: handler<CommandBrowsePoolsSelectPool>(({ store, command: { data } }) => {
            helpers.selectPool({ pool: data, store });
          }),
          CommandBrowsePoolsShowPoolDetails: handler<CommandBrowsePoolsShowPoolDetails>(
            ({ store, command: { data } }) => {
              helpers.showPoolDetails({ pool: data, store, targetMode: Flow.PoolDetails });
            }
          ),
        },
        params.command.type as BrowsePoolsCommand['type'],
        Flow.BrowsePools
      ),
      [Flow.CurrentPoolDetails]: () => void 0,
      [Flow.PoolDetails]: cases<PoolDetailsCommand['type']>(
        {
          CommandPoolDetailsSelectPool: handler<CommandPoolDetailsSelectPool>(({ store, command: { data } }) => {
            helpers.selectPool({ pool: data, store });
          }),
        },
        params.command.type as PoolDetailsCommand['type'],
        Flow.PoolDetails
      ),
      [Flow.CurrentPortfolioManagement]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<DrawerPreferencesCommand['type']>(
            {
              CommandDrawerPreferencesUpdatePoolWeight: handler<CommandDrawerPreferencesUpdatePoolWeight>(
                ({
                  store,
                  command: {
                    data: { poolId, weight },
                  },
                }) => {
                  const pool = store.draftPortfolio.find(({ id }) => id === poolId);
                  if (!pool) return;
                  pool.weight = weight;
                }
              ),
            },
            params.command.type as DrawerPreferencesCommand['type'],
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
      [Flow.NewPortfolioCreation]: () => void 0,
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

export const useDelegationPortfolioStore = create(
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

import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAX_POOLS_COUNT } from './delegationPortfolio';
import { CurrentPortfolioStakePool, DraftPortfolioStakePool } from './types';

enum Mode {
  Overview = 'Overview',
  BrowsePools = 'BrowsePools',
  CurrentPoolDetails = 'CurrentPoolDetails',
  PoolDetails = 'PoolDetails',
  CurrentPortfolioManagement = 'CurrentPortfolioManagement',
  NewPortfolioCreation = 'NewPortfolioCreation',
}

enum DrawerDefaultSection {
  DETAIL = 'detail',
}

enum DrawerManagementSection {
  PREFERENCES = 'preferences',
  CONFIRMATION = 'confirmation',
  SIGN = 'sign',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx',
}

type Section = DrawerDefaultSection | DrawerManagementSection;

enum OverviewCommand {
  ShowDetails = 'ShowDetails',
  Manage = 'Manage',
  GoToBrowsePools = 'GoToBrowsePools',
}

enum BrowsePoolsCommand {
  Select = 'Select',
  ShowDetails = 'ShowDetails',
}

enum PoolDetailsCommand {
  Select = 'Select',
}

enum DrawerPreferencesCommand {
  UpdateWeight = 'UpdateWeight',
}

type Command = OverviewCommand | BrowsePoolsCommand | PoolDetailsCommand | DrawerPreferencesCommand;

type DataOfCommand<C extends Command> = C extends OverviewCommand.ShowDetails
  ? Wallet.Cardano.StakePool
  : C extends BrowsePoolsCommand.ShowDetails
  ? Wallet.Cardano.StakePool
  : C extends BrowsePoolsCommand.Select
  ? DraftPortfolioStakePool
  : C extends PoolDetailsCommand.Select
  ? DraftPortfolioStakePool
  : C extends DrawerPreferencesCommand.UpdateWeight
  ? { poolId: Wallet.Cardano.PoolIdHex; weight: number }
  : undefined;

type State = {
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio: DraftPortfolioStakePool[];
  mode: Mode;
  section?: Section;
  selections: DraftPortfolioStakePool[];
  viewedStakePool?: Wallet.Cardano.StakePool;
};

type DelegationPortfolioStore = State & {
  mutators: {
    command: <C extends Command>(...params: DataOfCommand<C> extends undefined ? [C] : [C, DataOfCommand<C>]) => void;
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
  data: DataOfCommand<C>;
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
    const selectionsFull = store.selections.length === MAX_POOLS_COUNT;
    const alreadySelected = store.selections.some(({ id }) => pool.id === id);
    if (selectionsFull || alreadySelected) return;
    store.selections.push(pool);
  },
  showPoolDetails: ({
    pool,
    store,
    targetMode,
  }: {
    pool: Wallet.Cardano.StakePool;
    store: DelegationPortfolioStore;
    targetMode: Mode;
  }) => {
    store.mode = targetMode;
    store.section = DrawerDefaultSection.DETAIL;
    store.viewedStakePool = pool;
  },
};

const executeCommand: Handler = (params) =>
  cases<Mode>(
    {
      [Mode.Overview]: cases<OverviewCommand>(
        {
          [OverviewCommand.ShowDetails]: handler<OverviewCommand.ShowDetails>(({ store, data }) => {
            helpers.showPoolDetails({ pool: data, store, targetMode: Mode.CurrentPoolDetails });
          }),
          [OverviewCommand.Manage]: ({ store }) => {
            store.mode = Mode.CurrentPortfolioManagement;
            store.section = DrawerManagementSection.PREFERENCES;
            store.draftPortfolio = store.currentPortfolio;
          },
          [OverviewCommand.GoToBrowsePools]: ({ store }) => {
            store.mode = Mode.BrowsePools;
          },
        },
        params.command as OverviewCommand,
        Mode.Overview
      ),
      [Mode.BrowsePools]: cases<BrowsePoolsCommand>(
        {
          [BrowsePoolsCommand.ShowDetails]: handler<BrowsePoolsCommand.ShowDetails>(({ store, data }) => {
            helpers.showPoolDetails({ pool: data, store, targetMode: Mode.PoolDetails });
          }),
          [BrowsePoolsCommand.Select]: handler<BrowsePoolsCommand.Select>(({ store, data }) => {
            helpers.selectPool({ pool: data, store });
          }),
        },
        params.command as BrowsePoolsCommand,
        Mode.BrowsePools
      ),
      [Mode.CurrentPoolDetails]: () => void 0,
      [Mode.PoolDetails]: cases<PoolDetailsCommand>(
        {
          [PoolDetailsCommand.Select]: handler<PoolDetailsCommand.Select>(({ store, data }) => {
            helpers.selectPool({ pool: data, store });
          }),
        },
        params.command as PoolDetailsCommand,
        Mode.PoolDetails
      ),
      [Mode.CurrentPortfolioManagement]: cases<DrawerManagementSection>(
        {
          [DrawerManagementSection.PREFERENCES]: cases<DrawerPreferencesCommand>(
            {
              [DrawerPreferencesCommand.UpdateWeight]: handler<DrawerPreferencesCommand.UpdateWeight>(
                ({ store, data: { poolId, weight } }) => {
                  const pool = store.draftPortfolio.find(({ id }) => id === poolId);
                  if (!pool) return;
                  pool.weight = weight;
                }
              ),
            },
            params.command as DrawerPreferencesCommand,
            DrawerManagementSection.PREFERENCES
          ),
          [DrawerManagementSection.CONFIRMATION]: () => void 0,
          [DrawerManagementSection.SIGN]: () => void 0,
          [DrawerManagementSection.SUCCESS_TX]: () => void 0,
          [DrawerManagementSection.FAIL_TX]: () => void 0,
        },
        params.store.section as DrawerManagementSection,
        Mode.CurrentPortfolioManagement
      ),
      [Mode.NewPortfolioCreation]: () => void 0,
    },
    params.store.mode,
    'root'
  )(params);

const defaultState: State = {
  currentPortfolio: [],
  draftPortfolio: [],
  mode: Mode.Overview,
  section: undefined,
  selections: [],
  viewedStakePool: undefined,
};

export const useDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set) => ({
    ...defaultState,
    mutators: {
      command: (...params) => {
        set((store) => executeCommand({ command: params[0], data: params[1], store }));
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

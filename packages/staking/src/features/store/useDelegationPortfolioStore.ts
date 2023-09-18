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
    // WIP: trying to match command to its corresponding data/payload
    // In order to have proper type safety we need to have a discriminated union here matching a command with its data type
    command: ((type: OverviewCommand.ShowDetails, data: Wallet.Cardano.StakePool) => void) &
      ((type: Command, data?: any) => void);
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
type Handler<D = any> = (params: { state: State; command: Command; data: D }) => void;

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
  <T extends string, D = any>(definition: Record<T, Handler<D>>, discriminator: T, parentName: string): Handler<D> =>
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
  <D = any>(handlerBody: Handler<D>): Handler<D> =>
  (params) =>
    handlerBody(params);

const helpers = {
  selectPool: ({ pool, state }: { pool: DraftPortfolioStakePool; state: State }) => {
    const selectionsFull = state.selections.length === MAX_POOLS_COUNT;
    const alreadySelected = state.selections.some(({ id }) => pool.id === id);
    if (selectionsFull || alreadySelected) return;
    state.selections.push(pool);
  },
  showPoolDetails: ({
    pool,
    state,
    targetMode,
  }: {
    pool: Wallet.Cardano.StakePool;
    state: State;
    targetMode: Mode;
  }) => {
    state.mode = targetMode;
    state.section = DrawerDefaultSection.DETAIL;
    state.viewedStakePool = pool;
  },
};

const executeCommand: Handler = (params) =>
  cases<Mode>(
    {
      [Mode.Overview]: cases<OverviewCommand>(
        {
          [OverviewCommand.ShowDetails]: handler<Wallet.Cardano.StakePool>(({ state, data }) => {
            helpers.showPoolDetails({ pool: data, state, targetMode: Mode.CurrentPoolDetails });
          }),
          [OverviewCommand.Manage]: ({ state }) => {
            state.mode = Mode.CurrentPortfolioManagement;
            state.section = DrawerManagementSection.PREFERENCES;
            state.draftPortfolio = state.currentPortfolio;
          },
          [OverviewCommand.GoToBrowsePools]: ({ state }) => {
            state.mode = Mode.BrowsePools;
          },
        },
        params.command as OverviewCommand,
        Mode.Overview
      ),
      [Mode.BrowsePools]: cases<BrowsePoolsCommand>(
        {
          [BrowsePoolsCommand.ShowDetails]: handler<Wallet.Cardano.StakePool>(({ state, data }) => {
            helpers.showPoolDetails({ pool: data, state, targetMode: Mode.PoolDetails });
          }),
          [BrowsePoolsCommand.Select]: handler<DraftPortfolioStakePool>(({ state, data }) => {
            helpers.selectPool({ pool: data, state });
          }),
        },
        params.command as BrowsePoolsCommand,
        Mode.BrowsePools
      ),
      [Mode.CurrentPoolDetails]: () => void 0,
      [Mode.PoolDetails]: cases<PoolDetailsCommand>(
        {
          [PoolDetailsCommand.Select]: handler<DraftPortfolioStakePool>(({ state, data }) => {
            helpers.selectPool({ pool: data, state });
          }),
        },
        params.command as PoolDetailsCommand,
        Mode.PoolDetails
      ),
      [Mode.CurrentPortfolioManagement]: cases<DrawerManagementSection>(
        {
          [DrawerManagementSection.PREFERENCES]: cases<DrawerPreferencesCommand>(
            {
              [DrawerPreferencesCommand.UpdateWeight]: handler<{ poolId: Wallet.Cardano.PoolIdHex; weight: number }>(
                ({ state, data: { poolId, weight } }) => {
                  const pool = state.draftPortfolio.find(({ id }) => id === poolId);
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
        params.state.section as DrawerManagementSection,
        Mode.CurrentPortfolioManagement
      ),
      [Mode.NewPortfolioCreation]: () => void 0,
    },
    params.state.mode,
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
      command: (type, data) => {
        // WIP: trying to match command to its corresponding data/payload
        // if (type === OverviewCommand.ShowDetails) {
        //   data.hexId;
        // }
        set((state) => executeCommand({ command: type, data, state }));
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

import { Wallet } from '@lace/cardano';
import { BrowsePoolsView, SortField, SortOrder } from 'features/BrowsePools';
import { AdaSymbol, StakePoolDetails } from '../types';
import { Command } from './commands';

export type StakePoolWithLogo = Wallet.Cardano.StakePool & { logo?: string };

type PortfolioStakePoolBase = {
  id: Wallet.Cardano.Cip17Pool['id'];
  displayData: StakePoolDetails;
  stakePool: Wallet.Cardano.StakePool;
};

type CurrentPortfolioSpecificProps = {
  savedIntegerPercentage: number | null; // todo: type for integers
  onChainPercentage: number;
};

export type DraftPortfolioStakePool = PortfolioStakePoolBase & {
  sliderIntegerPercentage: number; // todo: type for integers
} & Partial<CurrentPortfolioSpecificProps>;

export type CurrentPortfolioStakePool = PortfolioStakePoolBase &
  CurrentPortfolioSpecificProps & {
    displayData: StakePoolDetails & {
      lastReward: bigint;
      totalRewards: bigint;
    };
    value: bigint;
  };

export enum DelegationFlow {
  Overview = 'Overview',
  BrowsePools = 'BrowsePools',
  Activity = 'Activity',
  CurrentPoolDetails = 'CurrentPoolDetails',
  PoolDetails = 'PoolDetails',
  PortfolioManagement = 'PortfolioManagement',
  ChangingPreferences = 'ChangingPreferences',
  NewPortfolio = 'NewPortfolio',
}

export type ExpandedViewDelegationFlow = DelegationFlow;

export type PopupViewDelegationFlow = DelegationFlow.Overview | DelegationFlow.CurrentPoolDetails;

export enum DrawerDefaultStep {
  PoolDetails = 'PoolDetails',
}

export enum DrawerManagementStep {
  Preferences = 'Preferences',
  Confirmation = 'Confirmation',
  Sign = 'Sign',
  Success = 'Success',
  Failure = 'Failure',
  HwDeviceFailure = 'HwDeviceFailure',
}

export type DrawerStep = DrawerDefaultStep | DrawerManagementStep;

type BaseState = {
  activeDelegationFlow: DelegationFlow;
  activeDrawerStep?: DrawerStep;
};

export type SupportingData = {
  pendingSelectedPortfolio?: DraftPortfolioStakePool[];
  draftPortfolio?: DraftPortfolioStakePool[];
  viewedStakePool?: StakePoolWithLogo;
  sortField?: SortField;
  sortOrder?: SortOrder;
  searchQuery?: string;
};

export type CrossStateData = {
  cardanoCoinSymbol: AdaSymbol;
  currentPortfolio: CurrentPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
  browsePoolsView: BrowsePoolsView;
};

type StateMachineSpecificState = BaseState & SupportingData;

type MakeState<S extends StateMachineSpecificState> = CrossStateData & StateMachineSpecificState & S;

export type StateOverview = MakeState<{
  activeDelegationFlow: DelegationFlow.Overview;
  activeDrawerStep: undefined;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StateActivity = MakeState<{
  activeDelegationFlow: DelegationFlow.Activity;
  activeDrawerStep: undefined;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StateCurrentPoolDetails = MakeState<{
  activeDrawerStep: DrawerDefaultStep.PoolDetails;
  activeDelegationFlow: DelegationFlow.CurrentPoolDetails;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: StakePoolWithLogo;
}>;

export type StatePortfolioManagement = MakeState<{
  activeDrawerStep: DrawerManagementStep;
  activeDelegationFlow: DelegationFlow.PortfolioManagement;
  draftPortfolio: DraftPortfolioStakePool[];
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StateBrowsePools = MakeState<{
  activeDelegationFlow: DelegationFlow.BrowsePools;
  activeDrawerStep: undefined;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StatePoolDetails = MakeState<{
  activeDrawerStep: DrawerDefaultStep.PoolDetails;
  activeDelegationFlow: DelegationFlow.PoolDetails;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: StakePoolWithLogo;
}>;

export type StateNewPortfolio = MakeState<{
  activeDrawerStep: DrawerManagementStep;
  activeDelegationFlow: DelegationFlow.NewPortfolio;
  draftPortfolio: DraftPortfolioStakePool[];
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StateChangingPreferences = MakeState<{
  activeDrawerStep: undefined;
  activeDelegationFlow: DelegationFlow.ChangingPreferences;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: DraftPortfolioStakePool[];
  viewedStakePool: undefined;
}>;

export type State =
  | StateActivity
  | StateOverview
  | StateCurrentPoolDetails
  | StatePortfolioManagement
  | StateBrowsePools
  | StatePoolDetails
  | StateNewPortfolio
  | StateChangingPreferences;

export type ExecuteCommand = <C extends Command>(command: C) => void;

// TODO improve the types
export type Handler<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  C extends Command = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CurrentState extends State = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TargetState extends State = any
> = (params: { command: C; executeCommand: ExecuteCommand; state: CurrentState }) => TargetState;

import { Wallet } from '@lace/cardano';
import { AdaSymbol } from '../types';
import { Command } from './commands';

export type StakePoolWithLogo = Wallet.Cardano.StakePool & { logo?: string };

type PortfolioStakePoolBase = {
  id: Wallet.Cardano.Cip17Pool['id'];
  displayData: Wallet.util.StakePool;
  stakePool: Wallet.Cardano.StakePool;
};

type CurrentPortfolioSpecificProps = {
  savedIntegerPercentage: number; // todo: type for integers
  onChainPercentage: number;
};

export type DraftPortfolioStakePool = PortfolioStakePoolBase & {
  sliderIntegerPercentage: number; // todo: type for integers
} & (
    | { basedOnCurrentPortfolio: false } // TODO: re-consider moving to top-level
    | ({ basedOnCurrentPortfolio: true } & CurrentPortfolioSpecificProps)
  );

export type CurrentPortfolioStakePool = PortfolioStakePoolBase &
  CurrentPortfolioSpecificProps & {
    displayData: Wallet.util.StakePool & {
      lastReward: bigint;
      totalRewards: bigint;
    };
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

export type ExpandedViewFlow = Flow;

export type PopupViewFLow = Flow.Overview | Flow.CurrentPoolDetails;

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

type BaseState = {
  activeFlow: Flow;
  activeDrawerStep?: DrawerStep;
};

export type SupportingData = {
  pendingSelectedPortfolio?: DraftPortfolioStakePool[];
  draftPortfolio?: DraftPortfolioStakePool[];
  viewedStakePool?: StakePoolWithLogo;
};

export type CrossStateData = {
  cardanoCoinSymbol: AdaSymbol;
  currentPortfolio: CurrentPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
};

type StateMachineSpecificState = BaseState & SupportingData;

type MakeState<S extends StateMachineSpecificState> = CrossStateData & StateMachineSpecificState & S;

export type StateOverview = MakeState<{
  activeFlow: Flow.Overview;
  activeDrawerStep: undefined;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StateCurrentPoolDetails = MakeState<{
  activeDrawerStep: DrawerDefaultStep.PoolDetails;
  activeFlow: Flow.CurrentPoolDetails;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: StakePoolWithLogo;
}>;

export type StatePortfolioManagement = MakeState<{
  activeDrawerStep: DrawerManagementStep;
  activeFlow: Flow.PortfolioManagement;
  draftPortfolio: DraftPortfolioStakePool[];
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StateBrowsePools = MakeState<{
  activeFlow: Flow.BrowsePools;
  activeDrawerStep: undefined;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StatePoolDetails = MakeState<{
  activeDrawerStep: DrawerDefaultStep.PoolDetails;
  activeFlow: Flow.PoolDetails;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: StakePoolWithLogo;
}>;

export type StateNewPortfolio = MakeState<{
  activeDrawerStep: DrawerManagementStep;
  activeFlow: Flow.NewPortfolio;
  draftPortfolio: DraftPortfolioStakePool[];
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
}>;

export type StateChangingPreferences = MakeState<{
  activeDrawerStep: undefined;
  activeFlow: Flow.ChangingPreferences;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: DraftPortfolioStakePool[];
  viewedStakePool: undefined;
}>;

export type State =
  | StateOverview
  | StateCurrentPoolDetails
  | StatePortfolioManagement
  | StateBrowsePools
  | StatePoolDetails
  | StateNewPortfolio
  | StateChangingPreferences;

export type ExecuteCommand = <C extends Command>(command: C) => void;

export type Handler<
  C extends Command = any,
  CurrentState extends State = any,
  TargetState extends State = any
> = (params: { command: C; executeCommand: ExecuteCommand; state: CurrentState }) => TargetState;

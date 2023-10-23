import { TxBuilder, TxInspection } from '@cardano-sdk/tx-construction';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { StakingError } from '../../stakingStore';
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

export type DelegationTx = {
  builder?: TxBuilder;
  inspection?: TxInspection;
  isRestaking?: boolean;
  error?: StakingError;
  passwordInvalid?: boolean;
};

export type SubmitTransactionResultState = {
  passwordInvalid: boolean;
  activeDrawerStep?: DrawerManagementStep;
};

export type SupportingData = {
  pendingSelectedPortfolio?: DraftPortfolioStakePool[];
  draftPortfolio?: DraftPortfolioStakePool[];
  viewedStakePool?: StakePoolWithLogo;
  transaction?: DelegationTx;
};

export type CrossStateData = {
  cardanoCoinSymbol: AdaSymbol;
  currentPortfolio: CurrentPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
  inMemoryWallet?: ObservableWallet;
};

type StateMachineSpecificState = BaseState & SupportingData;

type MakeState<S extends StateMachineSpecificState> = CrossStateData & StateMachineSpecificState & S;

export type StateOverview = MakeState<{
  activeFlow: Flow.Overview;
  activeDrawerStep: undefined;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
  transaction: undefined;
}>;

export type StateCurrentPoolDetails = MakeState<{
  activeDrawerStep: DrawerDefaultStep.PoolDetails;
  activeFlow: Flow.CurrentPoolDetails;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: StakePoolWithLogo;
  transaction: undefined;
}>;

export type StatePortfolioManagement = MakeState<{
  activeDrawerStep: DrawerManagementStep;
  activeFlow: Flow.PortfolioManagement;
  draftPortfolio: DraftPortfolioStakePool[];
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
  transaction?: DelegationTx;
}>;

export type StateBrowsePools = MakeState<{
  activeFlow: Flow.BrowsePools;
  activeDrawerStep: undefined;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
  transaction: undefined;
}>;

export type StatePoolDetails = MakeState<{
  activeDrawerStep: DrawerDefaultStep.PoolDetails;
  activeFlow: Flow.PoolDetails;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: undefined;
  viewedStakePool: StakePoolWithLogo;
  transaction: undefined;
}>;

export type StateNewPortfolio = MakeState<{
  activeDrawerStep: DrawerManagementStep;
  activeFlow: Flow.NewPortfolio;
  draftPortfolio: DraftPortfolioStakePool[];
  pendingSelectedPortfolio: undefined;
  viewedStakePool: undefined;
  transaction?: DelegationTx; // how to make it available only in some step?
}>;

export type StateChangingPreferences = MakeState<{
  activeDrawerStep: undefined;
  activeFlow: Flow.ChangingPreferences;
  draftPortfolio: undefined;
  pendingSelectedPortfolio: DraftPortfolioStakePool[];
  viewedStakePool: undefined;
  transaction: undefined;
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

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
} & Partial<CurrentPortfolioSpecificProps>;

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

export type State = {
  activeDrawerStep?: DrawerStep;
  activeFlow: Flow;
  cardanoCoinSymbol: AdaSymbol;
  pendingSelectedPortfolio?: DraftPortfolioStakePool[];
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio?: DraftPortfolioStakePool[];
  selectedPortfolio: DraftPortfolioStakePool[];
  viewedStakePool?: StakePoolWithLogo;
};

export type ExecuteCommand = <C extends Command>(command: C) => void;

export type Handler<C extends Command = any> = (params: {
  command: C;
  executeCommand: ExecuteCommand;
  state: State;
}) => void;

import { Wallet } from '@lace/cardano';
import { StakePoolWithLogo } from './types';

export type CancelDrawer = {
  type: 'CancelDrawer';
};

export type DrawerBack = {
  type: 'DrawerBack';
};

export type DrawerContinue = {
  type: 'DrawerContinue';
};

export type AddStakePools = {
  type: 'AddStakePools';
};

export type UpdateStakePercentage = {
  type: 'UpdateStakePercentage';
  data: {
    id: Wallet.Cardano.PoolIdHex;
    newSliderPercentage: number;
  };
};

export type RemoveStakePool = {
  type: 'RemoveStakePool';
  data: Wallet.Cardano.PoolIdHex;
};

export type ShowDelegatedPoolDetails = {
  type: 'ShowDelegatedPoolDetails';
  data: StakePoolWithLogo;
};

export type ManagePortfolio = {
  type: 'ManagePortfolio';
};

export type GoToBrowsePools = {
  type: 'GoToBrowsePools';
};

export type GoToOverview = {
  type: 'GoToOverview';
};

export type SelectPoolFromList = {
  type: 'SelectPoolFromList';
  data: Wallet.Cardano.StakePool;
};

export type UnselectPoolFromList = {
  type: 'UnselectPoolFromList';
  data: Wallet.Cardano.PoolIdHex;
};

export type ClearSelections = {
  type: 'ClearSelections';
};

export type CreateNewPortfolio = {
  type: 'CreateNewPortfolio';
};

export type ShowPoolDetailsFromList = {
  type: 'ShowPoolDetailsFromList';
  data: StakePoolWithLogo;
};

export type SelectPoolFromDetails = {
  type: 'SelectPoolFromDetails';
  data: Wallet.Cardano.StakePool;
};

export type UnselectPoolFromDetails = {
  type: 'UnselectPoolFromDetails';
  data: Wallet.Cardano.PoolIdHex;
};

export type BeginSingleStaking = {
  type: 'BeginSingleStaking';
};

export type ConfirmChangingPreferences = {
  type: 'ConfirmChangingPreferences';
};

export type DiscardChangingPreferences = {
  type: 'DiscardChangingPreferences';
};

export type DrawerFailure = {
  type: 'DrawerFailure';
};

export type ManageDelegationFromDetails = {
  type: 'ManageDelegationFromDetails';
};

export type OverviewCommand = ShowDelegatedPoolDetails | ManagePortfolio | GoToBrowsePools;

export type BrowsePoolsCommand =
  | SelectPoolFromList
  | UnselectPoolFromList
  | ShowPoolDetailsFromList
  | GoToOverview
  | ClearSelections
  | CreateNewPortfolio;

export type CurrentPoolDetailsCommand = CancelDrawer;

export type PoolDetailsCommand =
  | CancelDrawer
  | SelectPoolFromDetails
  | UnselectPoolFromDetails
  | BeginSingleStaking
  | ManageDelegationFromDetails;

export type PortfolioManagementPreferencesCommand =
  | CancelDrawer
  | DrawerContinue
  | AddStakePools
  | RemoveStakePool
  | UpdateStakePercentage;

export type PortfolioManagementConfirmationCommand = CancelDrawer | DrawerContinue | DrawerBack;

export type PortfolioManagementSignCommand = CancelDrawer | DrawerContinue | DrawerFailure | DrawerBack;

export type PortfolioManagementFailureCommand = CancelDrawer | DrawerContinue | DrawerBack;

export type PortfolioManagementSuccessCommand = CancelDrawer;

export type ChangingPreferencesCommand = DiscardChangingPreferences | ConfirmChangingPreferences;

export type NewPortfolioPreferencesCommand =
  | CancelDrawer
  | DrawerContinue
  | AddStakePools
  | RemoveStakePool
  | UpdateStakePercentage;

export type NewPortfolioConfirmationCommand = CancelDrawer | DrawerContinue | DrawerBack;

export type NewPortfolioSignCommand = CancelDrawer | DrawerContinue | DrawerFailure | DrawerBack;

export type NewPortfolioFailureCommand = CancelDrawer | DrawerContinue | DrawerBack;

export type NewPortfolioSuccessCommand = CancelDrawer;

export type Command =
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

export type PopupOverviewCommand = ShowDelegatedPoolDetails;

export type PopupCurrentPoolDetailsCommand = CancelDrawer;

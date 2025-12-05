import { Wallet } from '@lace/cardano';
import { BrowsePoolsView, StakePoolSortOptions } from 'features/BrowsePools';
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

export type GoToActivity = {
  type: 'GoToActivity';
};

export type GoToBrowsePools = {
  type: 'GoToBrowsePools';
};

export type GoToOverview = {
  type: 'GoToOverview';
};

export type SelectPoolFromList = {
  type: 'SelectPoolFromList';
  data: Wallet.Cardano.StakePool[];
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
  data: {
    isSharedWallet: boolean;
  };
};

export type ConfirmChangingPreferences = {
  type: 'ConfirmChangingPreferences';
  data: {
    isSharedWallet: boolean;
  };
};

export type DiscardChangingPreferences = {
  type: 'DiscardChangingPreferences';
};

export type DrawerFailure = {
  type: 'DrawerFailure';
  data: {
    error: Error;
  };
};

export type ManageDelegationFromDetails = {
  type: 'ManageDelegationFromDetails';
};

export type HwSkipToSuccess = {
  type: 'HwSkipToSuccess';
};

export type HwSkipToFailure = {
  type: 'HwSkipToFailure';
  data: {
    error: Error;
  };
};

export type HwSkipToDeviceFailure = {
  type: 'HwSkipToDeviceFailure';
  data: {
    error: Error;
  };
};

export type SetSort = {
  type: 'SetSort';
  data: StakePoolSortOptions;
};

export type SetSearchQuery = {
  type: 'SetSearchQuery';
  data: string;
};

export type SetBrowsePoolsView = {
  type: 'SetBrowsePoolsView';
  data: BrowsePoolsView;
};

export type ActivityCommand = GoToOverview | GoToBrowsePools;

export type OverviewCommand =
  | ShowDelegatedPoolDetails
  | ManagePortfolio
  | GoToBrowsePools
  | GoToActivity
  // TODO: remove after we introduce a common hydration setter (cardanoCoin, browsePoolsView, currentPortfolio, view) - https://input-output.atlassian.net/browse/LW-9979
  | SelectPoolFromList
  | SetBrowsePoolsView;

export type BrowsePoolsCommand =
  | SelectPoolFromList
  | UnselectPoolFromList
  | ShowPoolDetailsFromList
  | GoToActivity
  | GoToOverview
  | ClearSelections
  | CreateNewPortfolio
  | SetSort
  | SetSearchQuery
  | SetBrowsePoolsView;

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

export type PortfolioManagementConfirmationCommand =
  | CancelDrawer
  | DrawerContinue
  | DrawerBack
  | HwSkipToSuccess
  | HwSkipToFailure
  | HwSkipToDeviceFailure;

export type PortfolioManagementSignCommand = CancelDrawer | DrawerContinue | DrawerFailure | DrawerBack;

export type PortfolioManagementFailureCommand = CancelDrawer | DrawerContinue | HwSkipToDeviceFailure;

export type PortfolioManagementHwFailureCommand = CancelDrawer | DrawerBack;

export type PortfolioManagementSuccessCommand = CancelDrawer;

export type ChangingPreferencesCommand = DiscardChangingPreferences | ConfirmChangingPreferences;

export type NewPortfolioPreferencesCommand =
  | CancelDrawer
  | DrawerContinue
  | AddStakePools
  | RemoveStakePool
  | UpdateStakePercentage;

export type NewPortfolioConfirmationCommand =
  | CancelDrawer
  | DrawerContinue
  | DrawerBack
  | HwSkipToSuccess
  | HwSkipToFailure
  | HwSkipToDeviceFailure;

export type NewPortfolioSignCommand = CancelDrawer | DrawerContinue | DrawerFailure | DrawerBack;

export type NewPortfolioFailureCommand = CancelDrawer | DrawerContinue | HwSkipToDeviceFailure;

export type NewPortfolioHwFailureCommand = CancelDrawer | DrawerBack;

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
  | PortfolioManagementHwFailureCommand
  | PortfolioManagementSuccessCommand
  | ChangingPreferencesCommand
  | NewPortfolioPreferencesCommand
  | NewPortfolioConfirmationCommand
  | NewPortfolioSignCommand
  | NewPortfolioFailureCommand
  | NewPortfolioHwFailureCommand
  | NewPortfolioSuccessCommand;

export type PopupOverviewCommand = ShowDelegatedPoolDetails;

export type PopupCurrentPoolDetailsCommand = CancelDrawer;

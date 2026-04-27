import type { FC } from 'react';

import type { SheetRoutes, StackRoutes, TabRoutes } from './routes';
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import type { Activity } from '@lace-contract/activities';
import type { FolderId, Token } from '@lace-contract/tokens';
import type { AccountId, WalletId } from '@lace-contract/wallet-repo';
import type {
  AvatarContent,
  DappConnectorSheetParams,
  IconName,
} from '@lace-lib/ui-toolkit';
import type {
  DerivationType,
  DeviceDescriptor,
  HardwareIntegrationId,
} from '@lace-lib/util-hw';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigationProp,
  NavigatorScreenParams,
  ParamListBase,
  RouteProp,
  StackActionHelpers,
  StackNavigationState,
} from '@react-navigation/native';
import type { StackScreenProps as ReactNavigationStackScreenProps } from '@react-navigation/stack';

export interface ExtendableSheetParams {}

type ExtendedParams<K extends string> = K extends keyof ExtendableSheetParams
  ? ExtendableSheetParams[K]
  : Record<string, never>;

export type { LinkingOptions } from '@react-navigation/native';
export type NavigationState = {
  index?: number;
  routes: Array<{
    name: string;
    params?: unknown;
    state?: NavigationState;
  }>;
};
export type TabParameterList = {
  [TabRoutes.Portfolio]: undefined;
  [TabRoutes.DApps]: undefined;
  [TabRoutes.Settings]: undefined;
  [TabRoutes.AccountCenter]: undefined;
  [TabRoutes.Support]: undefined;
  [TabRoutes.About]: undefined;
  [TabRoutes.Contacts]: undefined;
  [TabRoutes.StakingCenter]: undefined;
  [TabRoutes.IdentityCenter]: undefined;
  [TabRoutes.NotificationCenter]: undefined;
  [TabRoutes.Swaps]: undefined;
};

export type StackParameterList = {
  [StackRoutes.Home]: NavigatorScreenParams<TabParameterList>;
  [StackRoutes.AccountDetails]: {
    walletId: string;
    accountId: string;
  };
  [StackRoutes.WalletSettings]: { walletId: WalletId; origin?: 'add-wallet' };
  [StackRoutes.AddWallet]: undefined;
  [StackRoutes.OnboardingStart]: undefined;
  [StackRoutes.OnboardingRestoreWallet]: undefined;
  [StackRoutes.OnboardingCreateWallet]: undefined;
  [StackRoutes.OnboardingDesktopLogin]:
    | {
        hardwareSetup?: {
          optionId: HardwareIntegrationId;
          device: DeviceDescriptor;
          derivationTypes?: Array<'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER'>;
        };
      }
    | undefined;
  [StackRoutes.OnboardingHardware]: undefined;
  [StackRoutes.OnboardingHardwareSetup]: {
    optionId: HardwareIntegrationId;
    device: DeviceDescriptor;
    derivationTypes?: Array<'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER'>;
  };
  [StackRoutes.DappExternalWebView]: BaseSheetParams & DappConnectorSheetParams;
  [StackRoutes.ClaimPayload]: {
    faucet_url: string;
    code: string;
    user_id?: string;
  };
  [StackRoutes.ClaimSuccess]: undefined;
  [StackRoutes.ClaimError]: undefined;
  // Identity center
  [StackRoutes.IntroStart]: BaseSheetParams;
  [StackRoutes.IntroLace]: BaseSheetParams;
  [StackRoutes.IntroProof]: BaseSheetParams;
  [StackRoutes.IntroPrivacy]: BaseSheetParams;
  [StackRoutes.IntroComplete]: BaseSheetParams;
  // Notifications center
  [StackRoutes.NotificationDetails]: BaseSheetParams & {
    notificationId: string;
  };
};

export type SheetParameterList = {
  [SheetRoutes.Initial]: BaseSheetParams;
  [SheetRoutes.AddedAccountSuccess]: BaseSheetParams;
  [SheetRoutes.AddedAccountFailed]: BaseSheetParams;
  [SheetRoutes.AddAccount]: BaseSheetParams & {
    walletId: string;
  };
  [SheetRoutes.CreateNewWallet]: BaseSheetParams;
  [SheetRoutes.AddWalletHardware]: BaseSheetParams;
  [SheetRoutes.AddWalletHardwareSetup]: BaseSheetParams & {
    optionId: HardwareIntegrationId;
    device: DeviceDescriptor;
    derivationTypes?: DerivationType[];
  };
  [SheetRoutes.SuccessCreateNewWallet]: BaseSheetParams & {
    walletId: WalletId;
  };
  [SheetRoutes.RestoreWalletRecoveryPhrase]: BaseSheetParams;
  [SheetRoutes.RestoreWalletSelectBlockchains]: BaseSheetParams;
  [SheetRoutes.RestoreWalletSuccess]: BaseSheetParams & {
    walletId: WalletId;
  };
  [SheetRoutes.RemoveAccount]: BaseSheetParams & {
    walletId: string;
    accountId: string;
  };
  [SheetRoutes.RemoveAccountSuccess]: BaseSheetParams;
  [SheetRoutes.RemoveWalletSuccess]: BaseSheetParams;
  [SheetRoutes.CustomizeAccount]: BaseSheetParams & {
    walletId: string;
    accountId: string;
  };
  [SheetRoutes.CustomizeAccountSuccess]: BaseSheetParams;
  [SheetRoutes.AuthorizedDApps]: BaseSheetParams;
  [SheetRoutes.Receive]: BaseSheetParams;
  [SheetRoutes.Send]: BaseSheetParams & {
    accountId?: AccountId;
    assetsSelected?: Token[];
    recipientAddress?: string;
  };
  [SheetRoutes.AddAssets]: BaseSheetParams & {
    accountId: AccountId;
    blockchainName: string;
  };
  [SheetRoutes.AddressBook]: BaseSheetParams & {
    accountId: AccountId;
  };
  [SheetRoutes.QrScanner]: BaseSheetParams;
  [SheetRoutes.ReviewTransaction]: BaseSheetParams & {
    accountId: string;
    accountName: string;
    blockchainName: string;
  };
  [SheetRoutes.SendResult]: BaseSheetParams & {
    accountId: string;
    result: {
      status: 'failure' | 'processing' | 'success';
      blockchain: string;
    };
  };
  [SheetRoutes.AccountKey]: BaseSheetParams & {
    walletId: string;
    accountId: string;
  };
  [SheetRoutes.RecoveryPhrase]: BaseSheetParams & {
    walletId: WalletId;
  };
  [SheetRoutes.RecoveryPhraseVerification]: BaseSheetParams & {
    walletId: WalletId;
  };
  [SheetRoutes.SuccessRecoveryPhraseVerification]: BaseSheetParams;
  [SheetRoutes.EditFolder]: BaseSheetParams & {
    folderId: FolderId;
    accountId: AccountId;
  };
  [SheetRoutes.CreateFolder]: BaseSheetParams & {
    accountId: AccountId;
  };
  [SheetRoutes.HardwareWalletDiscoverySearching]: BaseSheetParams;
  [SheetRoutes.HardwareWalletDiscoveryError]: BaseSheetParams;
  [SheetRoutes.HardwareWalletDiscoveryResults]: BaseSheetParams & {
    devices: Array<{
      id: string;
      name: string;
      icon: string;
    }>;
  };
  [SheetRoutes.Buy]: BaseSheetParams & {
    accountId?: string;
  };
  [SheetRoutes.ThemeSelection]: BaseSheetParams;
  [SheetRoutes.Language]: BaseSheetParams;
  [SheetRoutes.NetworkSelection]: BaseSheetParams;
  [SheetRoutes.FiatCurrencySheet]: BaseSheetParams;
  [SheetRoutes.AssetDetailBottomSheet]: BaseSheetParams & {
    token: Token;
    // Origin marker: was the sheet opened from the portfolio (multi-account)
    // tokens list? Immutable for the lifetime of the sheet entry — controls
    // whether a back-to-portfolio affordance is shown after drilling down.
    isFromPortfolio?: boolean;
    // Current view inside the sheet. Mutable via `navigation.setParams` so the
    // drill-down survives re-mounts when child sheets (e.g. ActivityDetail)
    // are pushed on top. Defaults to `isFromPortfolio` on first mount.
    isPortfolioView?: boolean;
  };
  [SheetRoutes.ActivityDetail]: BaseSheetParams & {
    activityId: string;
    activity?: Activity;
  };
  [SheetRoutes.StakingIssue]: BaseSheetParams & {
    accountId: string;
    issueType: 'high-saturation' | 'locked' | 'pledge' | 'retiring';
  };
  [SheetRoutes.ComingSoon]: BaseSheetParams & {
    featureName: string;
  };
  [SheetRoutes.Collateral]: BaseSheetParams & {
    accountId: string;
    walletId: string;
  };
  [SheetRoutes.BrowsePool]: BaseSheetParams & {
    searchQuery?: string;
    accountId: string;
    browsePoolSortOption?: string;
    browsePoolSortOrder?: string;
  };
  [SheetRoutes.BrowsePoolFilterControls]: BaseSheetParams & {
    accountId: string;
    searchQuery?: string;
    browsePoolSortOption?: string;
    browsePoolSortOrder?: string;
  };
  [SheetRoutes.StakePoolDetails]: BaseSheetParams & {
    poolId: string;
    searchQuery?: string;
    accountId: string;
    browsePoolSortOption?: string;
    browsePoolSortOrder?: string;
  };
  [SheetRoutes.StakeDelegation]: BaseSheetParams & {
    accountId: string;
  };
  [SheetRoutes.NewDelegation]: BaseSheetParams & {
    poolId: string;
    accountId: string;
  };
  [SheetRoutes.DelegationSuccess]: BaseSheetParams;
  [SheetRoutes.DeregisterPool]: BaseSheetParams & {
    accountId: string;
  };
  [SheetRoutes.DeregistrationSuccess]: BaseSheetParams;
  [SheetRoutes.EditWallet]: BaseSheetParams & { walletId: string };
  [SheetRoutes.EditWalletSuccess]: BaseSheetParams;
  [SheetRoutes.AddContact]: BaseSheetParams & {
    contactId?: string;
  };
  [SheetRoutes.ContactDetails]: BaseSheetParams & {
    contactId?: string;
  };
  [SheetRoutes.SelectAccount]: BaseSheetParams &
    ExtendedParams<'SelectAccount'>;
  [SheetRoutes.DappDetail]: BaseSheetParams & {
    activeDapp: number;
  };
  [SheetRoutes.DappFilterControls]: BaseSheetParams;
  [SheetRoutes.AuthorizeDapp]: BaseSheetParams & {
    title?: string;
    dapp: {
      icon: AvatarContent;
      name: string;
      category: string;
      coinIcons?: IconName[];
    };
    dappOrigin: string;
    details?: string;
    /**
     * Optional dApp security/trust status for the status tag below origin.
     * - trusted: show "Only connect to trusted DApps" (e.g. when origin is https)
     * - blocked: show "This is a blacklisted DApp" (requires blocklist; set by opener when implemented)
     * - unsecured: show "This site is unsecured" (e.g. when origin is not https)
     * Mobile side-effect derives trusted/unsecured from origin when opening the sheet.
     */
    dappStatus?: 'blocked' | 'trusted' | 'unsecured';
  };
  [SheetRoutes.SignData]: BaseSheetParams & {
    requestId: string;
    dapp: {
      icon: AvatarContent;
      name: string;
      origin: string;
    };
    address: string;
    payload: string;
  };
  [SheetRoutes.SignTx]: BaseSheetParams & {
    requestId: string;
    dapp: {
      icon: AvatarContent;
      name: string;
      origin: string;
    };
    txHex: string;
    partialSign: boolean;
  };
  [SheetRoutes.MidnightSettings]: BaseSheetParams;
  [SheetRoutes.EditTokenName]: BaseSheetParams & {
    token: Token;
    takenTokenNames: string[];
  };
  [SheetRoutes.DustDesignation]: BaseSheetParams & {
    accountId: AccountId;
  };
  // Identity center

  [SheetRoutes.ConnectionDetails]: BaseSheetParams;
  [SheetRoutes.ConnectionPending]: BaseSheetParams;
  [SheetRoutes.ConnectionComplete]: BaseSheetParams;
  [SheetRoutes.KYCDetails]: BaseSheetParams;
  [SheetRoutes.KYCWebview]: BaseSheetParams;
  // Swap center
  [SheetRoutes.SwapSelectSellToken]: BaseSheetParams;
  [SheetRoutes.SwapSelectBuyToken]: BaseSheetParams;
  [SheetRoutes.SwapSlippage]: BaseSheetParams;
  [SheetRoutes.SwapLiquiditySources]: BaseSheetParams;
  [SheetRoutes.SwapReview]: BaseSheetParams;
  [SheetRoutes.SwapResult]: BaseSheetParams;
};

export type BaseSheetParams =
  | {
      preventAnimation?: boolean;
      hasNestedScrolling?: boolean;
      featureName?: string;
      /**
       * When true, the sheet cannot be closed by the user (gesture or backdrop).
       * Use for flows that must complete (e.g. send in progress). Programmatic
       * close via NavigationControls.sheets.close() still works.
       */
      preventClose?: boolean;
    }
  | undefined;

export type StackScreenProps<T extends keyof StackParameterList> =
  ReactNavigationStackScreenProps<StackParameterList, T>;

export type TabScreenProps<T extends keyof TabParameterList> =
  CompositeScreenProps<
    BottomTabScreenProps<TabParameterList, T>,
    StackScreenProps<keyof StackParameterList>
  >;

export type SheetNavigationOptions = {
  title?: string;
  headerShown?: boolean;
  /**
   * When true, the sheet cannot be closed by the user (gesture or backdrop).
   * Can be set per-screen via options. Programmatic close still works.
   */
  preventClose?: boolean;
  snapPoints?: string[];
  footer?: FC<BottomSheetFooterProps> | undefined;
};

export type SheetNavigationEventMap = {
  sheetClose: {
    data: { forced?: boolean };
    canPreventDefault: true;
  };
  sheetOpen: {
    data: undefined;
  };
};

export type SheetNavigationProperty<
  ParameterList extends ParamListBase,
  RouteName extends keyof ParameterList = keyof ParameterList,
  NavigatorID extends string | undefined = undefined,
> = NavigationProp<
  ParameterList,
  RouteName,
  NavigatorID,
  StackNavigationState<ParameterList>,
  SheetNavigationOptions,
  SheetNavigationEventMap
> &
  StackActionHelpers<ParameterList>;

export type SheetScreenProps<T extends keyof SheetParameterList> = {
  navigation: SheetNavigationProperty<SheetParameterList, T>;
  route: RouteProp<SheetParameterList, T>;
};

type NavigationOptions = {
  merge?: boolean;
  pop?: boolean;
  reset?: boolean;
  /**
   * When true, prevents the sheet from closing during navigation transitions.
   * Use this for flows where content changes may trigger unwanted sheet closes.
   */
  preventCloseOnTransition?: boolean;
};

export type NavigateParams<T extends SheetRoutes> = [
  route: T,
  params?: SheetParameterList[T],
  options?: NavigationOptions,
];

export type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export * from './routes';

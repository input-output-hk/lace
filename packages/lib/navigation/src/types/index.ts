import type { SheetRoutes, StackRoutes, TabRoutes } from './routes';
import type { Activity } from '@lace-contract/activities';
import type { FolderId, Token } from '@lace-contract/tokens';
import type {
  AccountId,
  WalletId,
  WalletType,
} from '@lace-contract/wallet-repo';
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
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  TrueSheetNavigationOptions,
  TrueSheetScreenProps,
} from '@lodev09/react-native-true-sheet/navigation';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
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

type PortfolioTokenSortParams = {
  tokenSortOption?: 'quantity' | 'ticker' | 'value';
  tokenSortOrder?: 'asc' | 'desc';
};

type PortfolioTokenSortSheetParams = PortfolioTokenSortParams & {
  isTokenPricingEnabled?: boolean;
};

type PortfolioTabParams = PortfolioTokenSortParams & {
  /** One-shot: open the accounts carousel focused on this account. */
  focusAccountId?: string;
};

export type TabParameterList = {
  [TabRoutes.Portfolio]: PortfolioTabParams | undefined;
  [TabRoutes.DApps]: undefined;
  [TabRoutes.Settings]: undefined;
  [TabRoutes.AccountCenter]: undefined;
  [TabRoutes.Support]: undefined;
  [TabRoutes.About]: undefined;
  [TabRoutes.Contacts]: undefined;
  [TabRoutes.StakingCenter]: undefined;
  [TabRoutes.GovernanceCenter]: undefined;
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
          walletType: WalletType;
          /** Undefined for air-gapped devices: no wired device is scanned. */
          device?: DeviceDescriptor;
          derivationTypes?: Array<'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER'>;
          /** Resolved from the explicit blockchain selection step. */
          blockchainName: BlockchainName;
        };
      }
    | undefined;
  [StackRoutes.OnboardingHardware]: undefined;
  [StackRoutes.OnboardingHardwareSetup]: {
    optionId: HardwareIntegrationId;
    walletType: WalletType;
    /** Undefined for air-gapped devices: no wired device is scanned. */
    device?: DeviceDescriptor;
    derivationTypes?: Array<'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER'>;
    /** Resolved from the explicit blockchain selection step. */
    blockchainName: BlockchainName;
  };
  [StackRoutes.DappExternalWebView]: DappConnectorSheetParams & {
    canFavorite?: boolean;
  };
  [StackRoutes.ClaimPayload]: {
    faucet_url: string;
    code: string;
    user_id?: string;
  };
  [StackRoutes.ClaimSuccess]: undefined;
  [StackRoutes.ClaimError]: undefined;
  // Identity center
  [StackRoutes.IntroStart]: undefined;
  [StackRoutes.IntroLace]: undefined;
  [StackRoutes.IntroProof]: undefined;
  [StackRoutes.IntroPrivacy]: undefined;
  [StackRoutes.IntroComplete]: undefined;
  // Notifications center
  [StackRoutes.NotificationDetails]: {
    notificationId: string;
  };
};

export type SheetParameterList = {
  [SheetRoutes.RootStack]: NavigatorScreenParams<StackParameterList>;
  [SheetRoutes.AddedAccountSuccess]: undefined;
  [SheetRoutes.AddedAccountFailed]: undefined;
  [SheetRoutes.AddAccount]: {
    walletId: string;
    hasNestedScrolling?: boolean;
  };
  [SheetRoutes.CreateNewWallet]: undefined;
  [SheetRoutes.AddWalletHardware]: undefined;
  [SheetRoutes.AddWalletHardwareSetup]: {
    optionId: HardwareIntegrationId;
    // Undefined for air-gapped devices; the connector resolves identity via the
    // QR account-export. Wired (Ledger/Trezor) flows still pass it.
    device?: DeviceDescriptor;
    derivationTypes?: DerivationType[];
    // Resolved from the explicit blockchain selection step.
    blockchainName: BlockchainName;
  };
  [SheetRoutes.SuccessCreateNewWallet]: {
    walletId: WalletId;
  };
  [SheetRoutes.RestoreWalletRecoveryPhrase]:
    | {
        hasNestedScrolling?: boolean;
      }
    | undefined;
  [SheetRoutes.RestoreWalletSelectBlockchains]:
    | {
        hasNestedScrolling?: boolean;
      }
    | undefined;
  [SheetRoutes.RestoreWalletSuccess]: {
    walletId: WalletId;
  };
  [SheetRoutes.RemoveAccount]: {
    walletId: string;
    accountId: string;
  };
  [SheetRoutes.RemoveAccountSuccess]: undefined;
  [SheetRoutes.RemoveWalletSuccess]: undefined;
  [SheetRoutes.CustomizeAccount]: {
    walletId: string;
    accountId: string;
  };
  [SheetRoutes.CustomizeAccountSuccess]: undefined;
  [SheetRoutes.AuthorizedDApps]:
    | {
        featureName?: string;
      }
    | undefined;
  [SheetRoutes.Receive]: undefined;
  [SheetRoutes.Send]: {
    accountId?: AccountId;
    assetsSelected?: Token[];
    recipientAddress?: string;
    /**
     * Provenance of `recipientAddress`. Used by analytics to attribute
     * `send | transaction | success/failure` to the entry vector. The QR
     * scanner and address-book pickers set this when navigating back; an
     * external entry (deep link, dapp connector) can pass `'navigation'`.
     * Manual typing is captured separately when the input dispatches.
     */
    recipientSource?: 'address-book' | 'manual' | 'navigation' | 'qr';
  };
  [SheetRoutes.AddAssets]: {
    accountId: AccountId;
    blockchainName: string;
  };
  [SheetRoutes.AddressBook]: {
    accountId: AccountId;
  };
  [SheetRoutes.QrScanner]: undefined;
  [SheetRoutes.ReviewTransaction]: {
    accountId: string;
    accountName: string;
    blockchainName: string;
  };
  [SheetRoutes.SendResult]: {
    accountId: string;
    result: {
      status: 'failure' | 'processing' | 'success';
      blockchain: string;
    };
  };
  [SheetRoutes.AccountKey]: {
    walletId: string;
    accountId: string;
  };
  [SheetRoutes.RecoveryPhrase]: {
    walletId: WalletId;
  };
  [SheetRoutes.RecoveryPhraseVerification]: {
    walletId: WalletId;
  };
  [SheetRoutes.SuccessRecoveryPhraseVerification]: undefined;
  [SheetRoutes.EditFolder]: {
    folderId: FolderId;
    accountId: AccountId;
  };
  [SheetRoutes.CreateFolder]: {
    accountId: AccountId;
  };
  [SheetRoutes.HardwareWalletDiscoveryError]: undefined;
  [SheetRoutes.HardwareWalletDiscoveryResults]: undefined;
  [SheetRoutes.Buy]: {
    accountId?: string;
  };
  [SheetRoutes.ThemeSelection]: undefined;
  [SheetRoutes.Language]: undefined;
  [SheetRoutes.NetworkSelection]: undefined;
  [SheetRoutes.FiatCurrencySheet]:
    | {
        featureName?: string;
      }
    | undefined;
  [SheetRoutes.AssetDetailBottomSheet]: {
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
  [SheetRoutes.PortfolioTokenSortControls]:
    | PortfolioTokenSortSheetParams
    | undefined;
  [SheetRoutes.ActivityDetail]: {
    activityId: string;
    activity?: Activity;
  };
  [SheetRoutes.DefaultOpenMode]: undefined;
  [SheetRoutes.StakingIssue]: {
    accountId: string;
    issueType: 'high-saturation' | 'locked' | 'pledge' | 'retiring';
  };
  [SheetRoutes.ComingSoon]: {
    featureName: string;
  };
  [SheetRoutes.Collateral]: {
    accountId: string;
    walletId: string;
  };
  [SheetRoutes.BrowsePool]: {
    searchQuery?: string;
    accountId: string;
    browsePoolSortOption?: string;
    browsePoolSortOrder?: string;
  };
  [SheetRoutes.BrowsePoolFilterControls]: {
    accountId: string;
    searchQuery?: string;
    browsePoolSortOption?: string;
    browsePoolSortOrder?: string;
  };
  [SheetRoutes.StakePoolDetails]: {
    poolId: string;
    searchQuery?: string;
    accountId: string;
    browsePoolSortOption?: string;
    browsePoolSortOrder?: string;
  };
  [SheetRoutes.StakeDelegation]: {
    accountId: string;
  };
  [SheetRoutes.NewDelegation]: {
    poolId: string;
    accountId: string;
  };
  [SheetRoutes.DelegationSuccess]: undefined;
  [SheetRoutes.DeregisterPool]: {
    accountId: string;
  };
  [SheetRoutes.DeregistrationSuccess]: undefined;
  [SheetRoutes.EditWallet]: { walletId: string };
  [SheetRoutes.EditWalletSuccess]: undefined;
  [SheetRoutes.AddContact]: {
    contactId?: string;
    source?: 'send-flow';
  };
  [SheetRoutes.ContactDetails]: {
    contactId?: string;
  };
  [SheetRoutes.SelectAccount]: ExtendedParams<'SelectAccount'>;
  [SheetRoutes.DappDetail]: {
    activeDapp: string;
  };
  [SheetRoutes.DappFilterControls]: undefined;
  [SheetRoutes.AuthorizeDapp]: {
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
  [SheetRoutes.SignData]: {
    requestId: string;
    dapp: {
      icon: AvatarContent;
      name: string;
      origin: string;
    };
    address: string;
    payload: string;
  };
  [SheetRoutes.SignTx]: {
    requestId: string;
    dapp: {
      icon: AvatarContent;
      name: string;
      origin: string;
    };
    txHex: string;
    partialSign: boolean;
  };
  [SheetRoutes.MidnightSettings]: undefined;
  [SheetRoutes.EditTokenName]: {
    token: Token;
    takenTokenNames: string[];
  };
  [SheetRoutes.DustDesignation]: {
    accountId: AccountId;
  };
  // Identity center

  [SheetRoutes.ConnectionDetails]: undefined;
  [SheetRoutes.ConnectionPending]: undefined;
  [SheetRoutes.ConnectionComplete]: undefined;
  [SheetRoutes.KYCDetails]: undefined;
  [SheetRoutes.KYCWebview]: undefined;
  // Swap center
  [SheetRoutes.SwapSelectSellToken]: undefined;
  [SheetRoutes.SwapSelectBuyToken]: undefined;
  [SheetRoutes.SwapSlippage]: undefined;
  [SheetRoutes.SwapLiquiditySources]: undefined;
  [SheetRoutes.SwapReview]: undefined;
  [SheetRoutes.SwapResult]: undefined;
  [SheetRoutes.LockSettings]: undefined;
  // Governance center
  [SheetRoutes.BrowseDRep]: {
    accountId: string;
  };
  [SheetRoutes.DRepDetails]: {
    accountId: string;
    drepId: string;
  };
  [SheetRoutes.NewDRepDelegation]: {
    accountId: string;
    dRep:
      | { type: 'alwaysAbstain' }
      | { type: 'alwaysNoConfidence' }
      | { type: 'specific'; drepId: string };
  };
  [SheetRoutes.DRepDelegationSuccess]: undefined;
};

export type StackScreenProps<T extends keyof StackParameterList> =
  CompositeScreenProps<
    ReactNavigationStackScreenProps<StackParameterList, T>,
    TrueSheetScreenProps<SheetParameterList, SheetRoutes.RootStack>
  >;

export type TabScreenProps<T extends keyof TabParameterList> =
  CompositeScreenProps<
    BottomTabScreenProps<TabParameterList, T>,
    StackScreenProps<StackRoutes.Home>
  >;

export type SheetScreenProps<T extends keyof SheetParameterList> =
  TrueSheetScreenProps<SheetParameterList, T>;

export type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
export type { TrueSheetNavigationOptions as SheetNavigationOptions };

export * from './routes';

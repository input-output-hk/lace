import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { AnyAddress } from '@lace-contract/addresses';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Action, AppConfig } from '@lace-contract/module';
import type { NetworkType } from '@lace-contract/network';
import type { Token } from '@lace-contract/tokens';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { FeeEntry, IconName } from '@lace-lib/ui-toolkit';
import type { UICustomisation } from '@lace-lib/util-render';
import type { BlockchainName } from '@lace-lib/util-store';

export type InitializeAppContext = () => void;

/**
 * Settings option item for the settings page
 */
export type SettingsOption = {
  id: string;
  titleKey: TranslationKey;
  subtitleKey?: TranslationKey;
  icon: IconName;
  onPress: () => void;
};

/**
 * Settings page UI customisation - allows blockchain modules to inject custom settings items.
 *
 * @property DeprecatedLMPWalletSection - (LMP only, deprecated) Custom component rendered in wallet settings section
 * @property SettingsOptions - Settings list items appended to the bottom of the settings page
 */
export type SettingsPageUICustomisation = UICustomisation<
  Partial<{
    /** @deprecated LMP: Custom component rendered in the wallet settings section */
    DeprecatedLMPWalletSection: ComponentType;
    /** Settings list items to append at the bottom of the settings page */
    SettingsOptions: SettingsOption[];
  }>
>;

export type AboutPageUICustomisation = UICustomisation<{
  options: {
    id: string;
    titleKey: TranslationKey;
    icon: IconName;
    configKey?: keyof AppConfig;
    onPress?: () => void;
  }[];
}>;

export type Dialogs = UICustomisation<{
  Dialog: ComponentType;
  location?: RegExp;
}>;

export type ProfileDropdownWalletsUICustomisation = UICustomisation<{
  Wallets: ComponentType;
}>;

export type DropdownMenuItemUICustomisation = UICustomisation<{
  MenuItem: ComponentType;
}>;

export type TxRestrictions = {
  tokenRestrictions: {
    disabledTokenIds: Set<string>;
    messages: string[];
  };
  addressRestrictions: {
    isRestricted: boolean;
    messages: string[];
  };
};

export type ComputeTxRestrictions = (params: {
  tokens: { tokenId: string; blockchainSpecific: unknown }[];
  selectedTokenIds: string[];
  existingTransferTokens: { blockchainSpecific: unknown }[];
  recipientAddress: string;
  networkId: string;
}) => TxRestrictions;

export type SendFlowSheetUICustomisation = UICustomisation<
  {
    showNoteSection: boolean;
    showMaxButton: boolean;
    showFiatConversion: boolean;
    /**
     * When true, hides the primary button on the send result success screen (e.g. Midnight uses close only).
     * Defaults to true when not provided.
     */
    hidePrimaryButtonOnSuccess?: boolean;
    /**
     * Native currency for this blockchain on the active network (fees, amount labels, summaries).
     * Deterministic per blockchain/network (e.g. ADA for Cardano, BTC for Bitcoin, DUST for Midnight).
     * Receives Lace mainnet vs testnet mode so the display ticker can vary (e.g. ADA vs tADA, DUST vs tDUST).
     */
    nativeTokenInfo: (params: { networkType: NetworkType }) => {
      tokenId: string;
      decimals: number;
      displayShortName: string;
    };
    /** Optional component for footer title row (e.g. InlineWindow content without close button, transparent background). Rendered below the sheet divider. */
    SheetFooterTitleRow?: ComponentType;
    /**
     * When true, the result sheet can be closed by the user while the tx is still processing.
     * When false, the result sheet cannot be closed until processing completes (success/failure).
     */
    isProcessingResultSheetClosable: boolean;
    NoticeComponent?: ComponentType;
    computeTxRestrictions?: ComputeTxRestrictions;
    /**
     * Optional fee section component (e.g. Bitcoin fee rate selector).
     * When provided, rendered in the send sheet between note and summary sections.
     * Component is self-contained (uses its own hook for state/handlers).
     */
    FeeSection?: ComponentType;
    /**
     * When true, the user can add and send more than one asset. When false, only one asset (e.g. Bitcoin).
     * Defaults to true when not provided.
     */
    canSendMoreThanOneAsset?: boolean;
    /**
     * Optional formatter for fee entry display (e.g. Bitcoin: show amount in sats with "Sats" label).
     * When provided, used when building estimated fee entries for the send sheet.
     */
    formatFeeEntryForDisplay?: (params: {
      feeAmount: string;
      token: FeeEntry['token'];
    }) => { amount: string; token: FeeEntry['token'] };
  },
  {
    blockchainOfTheTransaction: BlockchainName | null;
  }
>;

export type ReceiveSheetAddressData =
  | AnyAddress
  | Array<{ key: TranslationKey; address: AnyAddress }>
  | undefined;

export type ReceiveSheetAddressInfo =
  | ((address: AnyAddress) => TranslationKey | undefined)
  | undefined;

/** Per-blockchain customisation for receive sheet address data (e.g. Midnight: shielded, unshielded, dust). */
export type ReceiveSheetAddressDataCustomisation = UICustomisation<
  {
    getReceiveSheetAddressData: (
      selectedAccount: AnyAccount,
      addresses: AnyAddress[],
    ) => ReceiveSheetAddressData;
    getReceiveSheetAddressInfo?: (
      selectedAccount: AnyAccount,
    ) => ReceiveSheetAddressInfo;
  },
  BlockchainName
>;

export type TokenDetailsUICustomization<BlockchainSpecificMetadata = unknown> =
  UICustomisation<
    {
      getTagConfig: (token: Token<BlockchainSpecificMetadata>) =>
        | {
            textTranslationKey: TranslationKey;
            background?: string;
            textColor?: string;
          }
        | undefined;
      /**
       * Optional header rendered immediately above the activity list in the
       * per-account token detail sheet. Returns `null` to render nothing.
       * Must not wrap the list itself — the caller places it as a sibling.
       */
      RecentTransactionsContent: ComponentType<{
        token: Token<BlockchainSpecificMetadata>;
      }>;
      /**
       * When truthy, the per-account token detail sheet omits the activity
       * list entirely (only the header above it is rendered). Used by
       * blockchain modules that intentionally suppress on-chain activity
       * display for privacy reasons (e.g. Midnight shielded tokens).
       */
      shouldHideActivitiesList?: (
        token: Token<BlockchainSpecificMetadata>,
      ) => boolean;
      canEditTokenName?: (token: Token<BlockchainSpecificMetadata>) => boolean;
      /** Optional component rendered after the token name in the detail sheet (e.g. shielded pill). */
      TokenNameAddon?: ComponentType<{
        token: Token<BlockchainSpecificMetadata>;
      }>;
    },
    Token
  >;

export type AppNavigationMenuItemIcons = {
  Normal: ComponentType;
  Hovered: ComponentType;
  Active: ComponentType;
};

export type AppNavigationExtensionPageRender = {
  page: {
    Header: ComponentType;
    Content: ComponentType;
  };
  key: string;
  isActiveLocationPattern: RegExp;
  location: string;
};

type AnyAppMenuItem = {
  id: string;
  label: TranslationKey;
  icons: AppNavigationMenuItemIcons;
  badge?: number | string;
};

export type ActionAppMenuItem = AnyAppMenuItem & {
  type: 'action';
  action: Action;
};

export type NavigationAppMenuItem = AnyAppMenuItem & {
  type: 'navigation';
  navigation: AppNavigationExtensionPageRender;
  childRoutes?: AppNavigationExtensionPageRender[];
};

export type NavigationActionAppMenuItem = AnyAppMenuItem & {
  type: 'navigation-action';
  action: () => void;
};

export type AppMenuItem =
  | ActionAppMenuItem
  | NavigationActionAppMenuItem
  | NavigationAppMenuItem;

export type AppMenuItems = {
  menuItems?: AppMenuItem[];
};

export type TabMenuItems = {
  menuItems?: AppMenuItem[];
};

/**
 * Props passed to a blockchain-provided custom AccountCard component.
 * Common display data is provided by the parent to avoid redundant
 * Redux look-ups; the custom card only fetches blockchain-specific data.
 */
export type AccountCardCustomisationProps = {
  accountId: AccountId;
  accountName: string;
  accountIndex: number;
  /** Native asset display ticker for the active network (e.g. ADA / tADA, BTC, DUST). */
  coin: string;
  currency: string;
  /** Fiat balance formatted for display (e.g. "0.42"). */
  balanceCurrency?: string;
  onSendPress: () => void;
  onReceivePress: () => void;
  onAccountsPress: () => void;
  arePricesAvailable: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Per-blockchain account customisation.
 *
 * When `AccountCard` is provided the entire card is replaced — the blockchain
 * module owns the full rendering (layout, data fetching, actions).
 */
export type AccountUICustomisation = UICustomisation<{
  supportsNfts: boolean;
  AccountCard?: ComponentType<AccountCardCustomisationProps>;
  uiCustomisationSelector: (params: { blockchainName: string }) => boolean;
  /**
   * Native currency for this blockchain on the active network — same contract as
   * `SendFlowSheetUICustomisation.nativeTokenInfo`.
   */
  nativeTokenInfo: (params: { networkType: NetworkType }) => {
    tokenId: string;
    decimals: number;
    displayShortName: string;
  };
}>;

/** Per-blockchain customisation for portfolio account page banners (selector param optional) */
export type PortfolioBannerUICustomisation = UICustomisation<
  {
    PortfolioBanner?: ComponentType<{
      accountId: string;
    }>;
  },
  BlockchainName | void
>;

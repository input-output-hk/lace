/* eslint-disable camelcase */
export enum MatomoEventActions {
  CLICK_EVENT = 'click-event',
  HOVER_EVENT = 'hover-event'
}

export enum MatomoEventCategories {
  SEND_TRANSACTION = 'send-transaction',
  WALLET_CREATE = 'wallet-create',
  WALLET_RESTORE = 'wallet-restore',
  HW_CONNECT = 'hw-connect',
  VIEW_TOKENS = 'view-tokens',
  VIEW_NFT = 'view-nft',
  ADDRESS_BOOK = 'address-book',
  VIEW_TRANSACTIONS = 'view-transactions',
  STAKING = 'staking'
}

export type MatomoSendEventProps = {
  category: MatomoEventCategories;
  action: MatomoEventActions;
  name: string;
  value?: number;
};

export type Metadata = {
  _id?: string;
  cookie?: number;
  url: string;
};

export enum PostHogAction {
  // Hardware wallet connect
  OnboardingHWAnalyticsAgreeClick = 'onboarding | hardware wallet | analytics | agree | click',
  OnboardingHWAnalyticsSkipClick = 'onboarding | hardware wallet | analytics | skip | click',
  OnboardingHWClick = 'onboarding | hardware wallet | connect | click',
  OnboardinHWLaceTermsOfUseNextClick = 'onboarding | hardware wallet | lace terms of use | next | click',
  OnboardingHWConnectNextClick = 'onboarding | hardware wallet | connect hw | next | click',
  OnboardingHWSelectAccountNextClick = 'onboarding | hardware wallet | select hw account | next | click',
  OnboardingHWNameNextClick = 'onboarding | hardware wallet | name hw wallet | next | click',
  OnboardingHWDoneGoToWallet = 'onboarding | hardware wallet | all done | go to my wallet | click',
  // Restore wallet
  OnboardingRestoreDoneGoToWallet = 'onboarding | restore wallet | all done | go to my wallet | click',
  OnboardingRestoreAnalyticsAgreeClick = 'onboarding | restore wallet | analytics | agree | click',
  OnboardingRestoreAnalyticsSkipClick = 'onboarding | restore wallet | analytics | skip | click',
  OnboardingRestoreClick = 'onboarding | restore wallet | restore | click',
  OnboardingRestoreWarningMultiAddressWalletOkClick = 'onboarding | restore wallet | warning multi-address wallet | ok | click',
  OnboardingRestoreWarningMultiAddressWalletCancelClick = 'onboarding | restore wallet | warning multi-address wallet | cancel | click',
  OnboardingRestoreLaceTermsOfUseNextClick = 'onboarding | restore wallet | lace terms of use | next | click',
  OnboardingRestoreWalletNameNextClick = 'onboarding | restore wallet | wallet name | next | click',
  OnboardingRestoreWalletPasswordNextClick = 'onboarding | restore wallet | wallet password | next | click',
  OnboardingRestoreRecoveryPhraseLengthNextClick = 'onboarding | restore wallet | recovery phrase length | next | click',
  OnboardingRestoreEnterPassphrase01NextClick = 'onboarding | restore wallet | enter passphrase #01 | next | click',
  OnboardingRestoreEnterPassphrase09NextClick = 'onboarding | restore wallet | enter passphrase #09 | next | click',
  OnboardingRestoreEnterPassphrase17NextClick = 'onboarding | restore wallet | enter passphrase #17 | next | click',
  // Create new wallet
  OnboardingCreateDoneGoToWallet = 'onboarding | new wallet | all done | go to my wallet | click',
  OnboardingCreateAnalyticsAgreeClick = 'onboarding | new wallet | analytics | agree | click',
  OnboardingCreateAnalyticsSkipClick = 'onboarding | new wallet | analytics | skip | click',
  OnboardingCreateClick = 'onboarding | new wallet | create | click',
  OnboardingCreateLaceTermsOfUseNextClick = 'onboarding | new wallet | lace terms of use | next | click',
  OnboardingCreateWalletNameNextClick = 'onboarding | new wallet | wallet name | next | click',
  OnboardingCreateWalletPasswordNextClick = 'onboarding | new wallet | wallet password | next | click',
  OnboardingCreatePassphraseIntroNextClick = 'onboarding | new wallet | passphrase intro | next | click',
  OnboardingCreateWritePassphrase01NextClick = 'onboarding | new wallet | write passphrase #01 | next | click',
  OnboardingCreateWritePassphrase09NextClick = 'onboarding | new wallet | write passphrase #09 | next | click',
  OnboardingCreateWritePassphrase17NextClick = 'onboarding | new wallet | write passphrase #17 | next | click',
  OnboardingCreateEnterPassphrase01NextClick = 'onboarding | new wallet | enter passphrase #01 | next | click',
  OnboardingCreateEnterPassphrase09NextClick = 'onboarding | new wallet | enter passphrase #09 | next | click',
  OnboardingCreateEnterPassphrase17NextClick = 'onboarding | new wallet | enter passphrase #17 | next | click',
  // Staking
  StakingClick = 'staking | staking | click',
  StakingStakePoolClick = 'staking | staking | stake pool | click',
  StakingStakePoolDetailStakeOnThisPoolClick = 'staking | stake pool detail | stake on this pool | click',
  StakingSwitchingPoolFineByMeClick = 'staking | switching pool? | fine by me | click',
  StakingManageDelegationStakePoolConfirmationNextClick = 'staking | manage delegation | stake pool confirmation | next | click',
  StakingManageDelegationPasswordConfirmationConfirmClick = 'staking | manage delegation | password confirmation | confirm | click',
  StakingManageDelegationHurrayView = 'staking | manage delegation | hurray! | view',
  StakingManageDelegationHurrayCloseClick = 'staking | manage delegation | hurray! | close | click',
  StakingManageDelegationHurrayXClick = 'staking | manage delegation | hurray! | x | click',
  StakingManageDelegationSomethingWentWrongBackClick = 'staking | manage delegation | something went wrong | back | click',
  StakingManageDelegationSomethingWentWrongCancelClick = 'staking | manage delegation | something went wrong | cancel | click',
  StakingManageDelegationSomethingWentWrongXClick = 'staking | manage delegation | something went wrong | x | click',
  // Send Flow
  SendClick = 'send | send | click',
  SendTransactionDataReviewTransactionClick = 'send | transaction data | review transaction | click',
  SendTransactionSummaryConfirmClick = 'send | transaction summary | confirm | click',
  SendTransactionConfirmationConfirmClick = 'send | transaction confirmation | confirm | click',
  SendAllDoneView = 'send | all done | view',
  SendAllDoneViewTransactionClick = 'send | all done | view transaction | click',
  SendAllDoneCloseClick = 'send | all done | close | click',
  SendAllDoneXClick = 'send | all done | x | click',
  SendSomethingWentWrongView = 'send | something went wrong | view',
  SendSomethingWentWrongBackClick = 'send | something went wrong | back | click',
  SendSomethingWentWrongCancelClick = 'send | something went wrong | cancel | click',
  SendSomethingWentWrongXClick = 'send | something went wrong | x | click',
  // NFTs Flow
  NFTsClick = 'nft | nfts | click',
  NFTsImageClick = 'nft | nfts | nft image | click',
  // Settings
  SettingsNetworkClick = 'settings | network | click',
  SettingsNetworkPreviewClick = 'settings | network | preview | click',
  SettingsNetworkPreprodClick = 'settings | network | preprod | click',
  SettingsNetworkMainnetClick = 'settings | network | mainnet | click',
  SettingsNetworkXClick = 'settings | network | x | click',
  SettingsAuthorizedDappsClick = 'settings | authorized dapps | click',
  SettingsAuthorizedDappsTrashBinIconClick = 'settings | authorized dapps | trash bin icon | click',
  SettingsAuthorizedDappsHoldUpDisconnectDappClick = 'settings | authorized dapps | hold up! | disconnect dapp | click',
  SettingsAuthorizedDappsHoldUpBackClick = 'settings | authorized dapps | hold up! | back | click',
  SettingsYourKeysClick = 'settings | your keys | click',
  SettingsYourKeysShowPublicKeyClick = 'settings | your keys | show public key | click',
  SettingsYourKeysShowPublicKeyCopyClick = 'settings | your keys | show public key | copy | click',
  SettingsYourKeysShowPublicKeyXClick = 'settings | your keys | show public key | x | click',
  SettingsCollateralClick = 'settings | collateral | click',
  SettingsCollateralConfirmClick = 'settings | collateral | confirm | click',
  SettingsCollateralReclaimCollateralClick = 'settings | collateral | reclaim collateral | click',
  SettingsCollateralXClick = 'settings | collateral | x | click'
}

export enum EnhancedAnalyticsOptInStatus {
  OptedIn = 'ACCEPTED',
  OptedOut = 'REJECTED'
}

export enum UserTrackingType {
  Enhanced = 'enhanced',
  Basic = 'basic'
}

export enum ExtensionViews {
  Extended = 'extended',
  Popup = 'popup'
}

export enum TxRecipientType {
  AdaHandle = 'ADA Handle',
  RegularAddress = 'regular address'
}

export type OnboardingFlows = 'create' | 'restore' | 'hw' | 'forgot_password';
export type PostHogActionsKeys =
  | 'SETUP_OPTION_CLICK'
  | 'ANALYTICS_AGREE_CLICK'
  | 'ANALYTICS_SKIP_CLICK'
  | 'LACE_TERMS_OF_USE_NEXT_CLICK'
  | 'WALLET_NAME_NEXT_CLICK'
  | 'WALLET_PASSWORD_NEXT_CLICK'
  | 'PASSPHRASE_INTRO_NEXT_CLICK'
  | 'WRITE_PASSPHRASE_01_NEXT_CLICK'
  | 'WRITE_PASSPHRASE_09_NEXT_CLICK'
  | 'WRITE_PASSPHRASE_17_NEXT_CLICK'
  | 'ENTER_PASSPHRASE_01_NEXT_CLICK'
  | 'ENTER_PASSPHRASE_09_NEXT_CLICK'
  | 'ENTER_PASSPHRASE_17_NEXT_CLICK'
  | 'RESTORE_MULTI_ADDR_OK_CLICK'
  | 'RESTORE_MULTI_ADDR_CANCEL_CLICK'
  | 'RECOVERY_PASSPHRASE_LENGTH_NEXT_CLICK'
  | 'CONNECT_HW_NEXT_CLICK'
  | 'SELECT_HW_ACCOUNT_NEXT_CLICK'
  | 'DONE_GO_TO_WALLET';
export type PostHogOnboardingActionsValueType = Partial<Record<PostHogActionsKeys, PostHogAction>>;
export type PostHogOnboardingActionsType = Partial<Record<OnboardingFlows, PostHogOnboardingActionsValueType>>;
export type PostHogPersonProperties = {
  $set: {
    user_tracking_type: UserTrackingType;
  };
};
export type PostHogMetadata = {
  distinct_id?: string;
  alias_id?: string;
  view: ExtensionViews;
  sent_at_local: string;
  posthog_project_id: number;
} & PostHogPersonProperties;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostHogProperty = string | boolean | Record<string, any> | Array<Record<string, any>>;
export type PostHogProperties = Record<string, PostHogProperty>;

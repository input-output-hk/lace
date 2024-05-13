export enum PostHogAction {
  // wallet onboarding page
  OnboardingAnalyticsAgreeClick = 'wallet | onboarding | analytics banner | agree | click',
  OnboardingAnalyticsRejectClick = 'wallet | onboarding | analytics banner | reject | click',
  OnboardingAnalyticsLearnMoreClick = 'wallet | onboarding | analytics banner | learn more | click',
  OnboardingAnalyticsGotItClick = 'wallet | onboarding | help us improve your experience | got it | click',
  OnboardingMainViewPinExtensionClick = 'wallet | onboarding | lace main view | pin the wallet extension | click',
  OnboardingMainViewMultiAddressModalGotItClick = 'wallet | onboarding | lace main view | multi-address modal | got it | click',
  // Hardware wallet connect
  OnboardingHWClick = 'onboarding | hardware wallet revamp | connect | click',
  OnboardingHWConnectView = 'onboarding | hardware wallet revamp | connect your device | view',
  OnboardingHWPopupConnectClick = 'onboarding | hardware wallet revamp | native browser pop-up with HWs | connect | click',
  OnboardingHWConnectTryAgainClick = 'onboarding | hardware wallet revamp | connect your device | try again | click',
  OnboardingHWSetupWalletAccountNoClick = "onboarding | hardware wallet revamp | let's set up your wallet | Account No | click",
  OnboardingHWEnterWalletClick = "onboarding | hardware wallet revamp | let's set up your wallet | enter wallet | click",
  // Restore wallet
  OnboardingRestoreClick = 'onboarding | restore wallet revamp | restore | click',
  OnboardingRestoreEnterRecoveryPhraseNextClick = 'onboarding | restore wallet revamp |  enter your recovery phrase  | next | click',
  OnboardingRestoreEnterRecoveryPhrasePasteFromClipboardClick = 'onboarding | restore wallet revamp | enter your recovery phrase | paste from clipboard | click',
  OnboardingRestoreEnterRecoveryPhrasePasteReadMoreClick = 'onboarding | restore wallet revamp | enter your recovery phrase | best practices faq | click',
  OnboardingRestoreHdWallet = 'onboarding | restore wallet | hd wallet',
  OnboardingRestoreEnterWalletClick = "onboarding | restore wallet revamp | let's set up your new wallet | enter wallet | click",
  // Create new wallet
  OnboardingCreateClick = 'onboarding | new wallet revamp | create | click',
  OnboardingCreateSaveRecoveryPhraseNextClick = 'onboarding | new wallet revamp | save your recovery phrase | next | click',
  OnboardingCreateEnterRecoveryPhraseNextClick = 'onboarding | new wallet revamp | enter your recovery phrase | next | click',
  OnboardingCreateSaveRecoveryPhraseIntroPlayVideoClick = 'onboarding | new wallet revamp | save your recovery phrase | watch video | click',
  OnboardingCreateSaveRecoveryPhraseCopyToClipboardClick = 'onboarding | new wallet revamp | save your recovery phrase | copy to clipboard | click',
  OnboardingCreateSaveRecoveryPhraseCopyReadMoreClick = 'onboarding | new wallet revamp | save your recovery phrase | best practices faq | click',
  OnboardingCreateKeepWalletSecureGotItClick = 'onboarding | new wallet revamp | keeping your wallet secure | got it | click',
  OnboardingCreateEnterRecoveryPhrasePasteFromClipboardClick = 'onboarding | new wallet revamp | enter your recovery phrase | paste from clipboard | click',
  OnboardingCreateEnterRecoveryPhrasePasteReadMoreClick = 'onboarding | new wallet revamp | enter your recovery phrase | best practices faq | click',
  OnboardingCreateEnterWalletClick = "onboarding | new wallet revamp | let's set up your new wallet | enter wallet | click",
  // Multi wallet
  MultiWalletSwitchWallet = 'multiwallet | switch wallet | click',
  MultiWalletSwitchAccount = 'multiwallet | switch account | click',
  MultiWalletDisableAccount = 'multiwallet | disable account | click',
  MultiWalletEnableAccount = 'multiwallet | enable account | click',
  // Multi wallet Create new wallet
  MultiWalletCreateClick = 'multiwallet | new wallet revamp | create | click',
  MultiWalletCreateSaveRecoveryPhraseNextClick = 'multiwallet | new wallet revamp | save your recovery phrase | next | click',
  MultiWalletCreateEnterRecoveryPhraseNextClick = 'multiwallet | new wallet revamp | enter your recovery phrase | next | click',
  MultiWalletCreateSaveRecoveryPhraseIntroPlayVideoClick = 'multiwallet | new wallet revamp | save your recovery phrase | watch video | click',
  MultiWalletCreateSaveRecoveryPhraseCopyToClipboardClick = 'multiwallet | new wallet revamp | save your recovery phrase | copy to clipboard | click',
  MultiWalletCreateSaveRecoveryPhraseCopyReadMoreClick = 'multiwallet | new wallet revamp | save your recovery phrase | read more | click',
  MultiWalletCreateKeepWalletSecureGotItClick = 'multiwallet | new wallet revamp | keeping your wallet secure | got it | click',
  MultiWalletCreateEnterRecoveryPhrasePasteFromClipboardClick = 'multiwallet | new wallet revamp | enter your recovery phrase | paste from clipboard | click',
  MultiWalletCreateEnterRecoveryPhrasePasteReadMoreClick = 'multiwallet | new wallet revamp | enter your recovery phrase | read more | click',
  MultiWalletCreateEnterWalletClick = 'multiwallet | new wallet revamp | lets set up your new wallet | enter wallet | click',
  // TODO
  MultiWalletCreateSaveRecoveryPhrasePasteReadMoreClick = 'multiwallet | new wallet revamp | enter your recovery phrase | read more | click',
  MultiWalletCreateAdded = 'multiwallet | new wallet revamp | added',
  // Multi wallet Restore wallet
  MultiWalletRestoreClick = 'multiwallet | restore wallet revamp | restore | click',
  MultiWalletRestoreEnterRecoveryPhraseNextClick = 'multiwallet | new wallet revamp | enter your recovery phrase | next | click',
  MultiWalletRestoreEnterRecoveryPhrasePasteFromClipboardClick = 'multiwallet | restore wallet revamp | enter your recovery phrase | paste from clipboard | click',
  MultiWalletRestoreEnterRecoveryPhrasePasteReadMoreClick = 'multiwallet | restore wallet revamp | enter your recovery phrase | read more | click',
  MultiWalletRestoreHdWallet = 'multiwallet | restore wallet | hd wallet',
  MultiWalletRestoreEnterWalletClick = 'multiwallet | new wallet revamp | lets set up your new wallet | enter wallet | click',
  MultiWalletRestoreAdded = 'multiwallet | restore wallet | added',
  // Multi wallet Hardware wallet connect
  MultiWalletHWClick = 'multiwallet | hardware wallet | connect | click',
  MultiWalletHWConnectNextClick = 'multiwallet | hardware wallet | connect hw | next | click',
  MultiWalletHWSelectAccountNextClick = 'multiwallet | hardware wallet | select hw account | next | click',
  MultiWalletHWNameNextClick = 'multiwallet | hardware wallet | name hw wallet | next | click',
  MultiWalletHWAdded = 'multiwallet | hardware wallet | added',
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
  StakingAboutStakingFaqClick = 'staking | about staking | faq | click',
  StakingMultiDelegationDedicatedBlogClick = 'staking | multi-delegation | dedicated blog | click',
  StakingMultiDelegationGotItClick = 'staking | multi-delegation | got it | click',
  StakingActivityClick = 'staking | activity | click',
  StakingOverviewClick = 'staking | overview | click',
  StakingOverviewCopyAddressClick = 'staking | overview | copy address | click',
  StakingOverviewManageClick = 'staking | overview | manage | click',
  StakingOverviewBrowseStakePoolsHereClick = 'staking | overview | browse stake pools | here | click',
  StakingOverviewSelectOneOrMorePoolsToStakeToHereClick = 'staking | overview | select one or more pools to stake to | here | click',
  StakingBrowsePoolsClick = 'staking | browse pools | click',
  // StakingBrowsePoolsSearchClick is actually supposed to track start of typing
  // into the search field but we don't have any more appropriate action name than "click" for that
  StakingBrowsePoolsSearchClick = 'staking | browse pools | search | click',
  StakingBrowsePoolsRosClick = 'staking | browse pools | ros | click',
  StakingBrowsePoolsBlocksClick = 'staking | browse pools | blocks | click',
  StakingBrowsePoolsStakePoolDetailClick = 'staking | browse pools | stake pool detail | click',
  StakingBrowsePoolsStakePoolDetailStakeAllOnThisPoolClick = 'staking | browse pools | stake pool detail | stake all on this pool | click',
  StakingBrowsePoolsStakePoolDetailAddStakingPoolClick = 'staking | browse pools | stake pool detail | add staking pool | click',
  StakingBrowsePoolsStakePoolDetailUnselectPoolClick = 'staking | browse pools | stake pool detail | unselect pool | click',
  StakingBrowsePoolsStakePoolDetailManageDelegation = 'staking | browse pools | stake pool detail | manage delegation | click',
  StakingBrowsePoolsStakeClick = 'staking | browse pools | stake | click',
  StakingBrowsePoolsUnselectClick = 'staking | browse pools | unselect | click',
  StakingBrowsePoolsClearClick = 'staking | browse pools | clear | click',
  StakingBrowsePoolsNextClick = 'staking | browse pools | next | click',
  StakingBrowsePoolsManageDelegationAddStakePoolClick = 'staking | browse pools | manage delegation | add stake pool | click',
  StakingBrowsePoolsManageDelegationRemovePoolFromPortfolioClick = 'staking | browse pools | manage delegation | remove pool from portfolio | click',
  StakingBrowsePoolsManageDelegationConfirmClick = 'staking | browse pools | manage delegation | confirm | click',
  StakingBrowsePoolsMoreOptionsSortingTickerClick = 'staking | browse pools | more options sorting | ticker | click',
  StakingBrowsePoolsMoreOptionsSortingSaturationClick = 'staking | browse pools | more options sorting | saturation | click',
  StakingBrowsePoolsMoreOptionsSortingROSClick = 'staking | browse pools | more options sorting | ros | click',
  StakingBrowsePoolsMoreOptionsSortingCostClick = 'staking | browse pools | more options sorting | cost | click',
  StakingBrowsePoolsMoreOptionsSortingMarginClick = 'staking | browse pools | more options sorting | margin | click',
  StakingBrowsePoolsMoreOptionsSortingProducedBlocksClick = 'staking | browse pools | more options sorting | produced blocks | click',
  StakingBrowsePoolsMoreOptionsSortingPledgeClick = 'staking | browse pools | more options sorting | pledge | click',
  StakingBrowsePoolsMoreOptionsSortingLiveStakeClick = 'staking | browse pools | more options sorting | live-stake | click',
  StakingBrowsePoolsTickerClick = 'staking | browse pools | ticker | click',
  StakingBrowsePoolsSaturationClick = 'staking | browse pools | saturation | click',
  StakingBrowsePoolsROSClick = 'staking | browse pools | ros | click',
  StakingBrowsePoolsCostClick = 'staking | browse pools | cost | click',
  StakingBrowsePoolsMarginClick = 'staking | browse pools | margin | click',
  StakingBrowsePoolsProducedBlocksClick = 'staking | browse pools | produced blocks | click',
  StakingBrowsePoolsPledgeClick = 'staking | browse pools | pledge | click',
  StakingBrowsePoolsLiveStakeClick = 'staking | browse pools | live-stake | click',
  StakingBrowsePoolsToggleGridViewClick = 'staking | browse pools | toggle | grid view | click',
  StakingBrowsePoolsToggleListViewClick = 'staking | browse pools | toggle | list view | click',
  StakingChangingStakingPreferencesFineByMeClick = 'staking | changing staking preferences? | fine by me | click',
  StakingChangingStakingPreferencesCancelClick = 'staking | changing staking preferences? | cancel | click',
  StakingManageDelegationDelegationRatioSliderMinusClick = 'staking | manage delegation | delegation ratio slider | - | click',
  StakingManageDelegationDelegationRatioSliderPlusClick = 'staking | manage delegation | delegation ratio slider | + | click',
  StakingManageDelegationDelegationRatioSliderVolumePinDrag = 'staking | manage delegation | delegation ratio slider | volume pin | drag',
  StakingManageDelegationDelegationRatioSliderRatioNumberClick = 'staking | manage delegation | delegation ratio slider | ratio number | click',
  // Send Flow
  SendClick = 'send | send | click',
  SendTransactionDataReviewTransactionClick = 'send | transaction data | review transaction | click',
  SendTransactionSummaryConfirmClick = 'send | transaction summary | confirm | click',
  SendTransactionSummaryCancelClick = 'send | transaction summary | cancel | click',
  SendTransactionConfirmationConfirmClick = 'send | transaction confirmation | confirm | click',
  SendTransactionConfirmationCancelClick = 'send | transaction confirmation | cancel | click',
  SendTransactionConfirmed = 'send | transaction confirmed',
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
  NFTsSearchType = 'nft | nfts | search | type',
  NFTsCreateFolderClick = 'nft | nfts | create folder | click',
  NFTCreateFolderNameYourFolderNextClick = 'nft | create folder | name your folder | next | click',
  NFTCreateFolderSelectNftsNextClick = 'nft | create folder | select nfts | next | click',
  NFTDetailSetAsAvatarClick = 'nft | nft detail | set as your wallet avatar | click',
  // Address book
  AddressBookAddAddressClick = 'address book | add address | click',
  AddressBookAddNewAddressSaveAddressClick = 'address book | add new address | save address | click',
  AddressBookAddNewAddressCancelClick = 'address book | add new address | cancel | click',
  AddressBookAddressRecordClick = 'address book | address record | click',
  AddressBookAddressRecordCopyClick = 'address book | address record | copy | click',
  AddressBookAddressRecordEditClick = 'address book | address record | edit | click',
  AddressBookAddressRecordDeleteClick = 'address book | address record | delete | click',
  AddressBookAddressRecordHoldUpDeleteAddressClick = 'address book | address record | hold up! | delete address | click',
  AddressBookAddressRecordHoldUpCancelClick = 'address book | address record | hold up! | cancel | click',
  AddressBookAddressRecordEditAddressDoneClick = 'address book | address record | edit address | done | click',
  AddressBookAddressRecordEditAddressCancelClick = 'address book | address record | edit address | cancel | click',
  AddressBookAddressRecordEditAddressXClick = 'address book | address record | edit address | x | click',
  // Settings
  SettingsHelpClick = 'settings | help | click',
  SettingsHelpCreateSupportTicketClick = 'settings | help | create a support ticket | click',
  SettingsHelpXClick = 'settings | help | x | click',
  SettingsTermsAndConditionsClick = 'settings | terms and conditions | click',
  SettingsTermsAndConditionsXClick = 'settings | terms and conditions | x | click',
  SettingsPrivacyPolicyClick = 'settings | privacy policy | click',
  SettingsPrivacyPolicyXClick = 'settings | privacy policy | x | click',
  SettingsCookiePolicyClick = 'settings | cookie policy | click',
  SettingsCookiePolicyXClick = 'settings | cookie policy | x | click',
  SettingsRemoveWalletClick = 'settings | remove wallet | click',
  SettingsHoldUpRemoveWalletClick = 'settings | hold up | remove wallet | click',
  SettingsHoldUpBackClick = 'settings | hold up | back | click',
  SettingsNetworkClick = 'settings | network | click',
  SettingsNetworkPreviewClick = 'settings | network | preview | click',
  SettingsNetworkPreprodClick = 'settings | network | preprod | click',
  SettingsNetworkMainnetClick = 'settings | network | mainnet | click',
  SettingsNetworkSanchonetClick = 'settings | network | sanchonet | click',
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
  SettingsCollateralXClick = 'settings | collateral | x | click',
  SettingsCurrencyClick = 'settings | currency | click',
  SettingsCurrencySelectCurrencyClick = 'settings | currency | select currency | click',
  SettingsCurrencyXClick = 'settings | currency | x | click',
  SettingsThemeLightModeClick = 'settings | theme | light mode | click',
  SettingsThemeDarkModeClick = 'settings | theme | dark mode | click',
  SettingsShowRecoveryPhraseClick = 'settings | show recovery phrase | click',
  SettingsShowRecoveryPhraseEnterYourPasswordShowRecoveryPhraseClick = 'settings | show recovery phrase | enter your password | show recovery phrase | click',
  SettingsShowRecoveryPhraseYourRecoveryPhraseHidePassphraseClick = 'settings | show recovery phrase | Your recovery phrase (keep it secret!) | hide passphrase | click',
  SettingsShowRecoveryPhraseYourRecoveryPhraseXClick = 'settings | show recovery phrase | Your recovery phrase (keep it secret!) | x | click',
  SettingsAnalyticsAgreeClick = 'settings | analytics | agree | click',
  SettingsAnalyticsSkipClick = 'settings | analytics | skip | click',
  SettingsFaqsClick = 'settings | faqs | click',
  SettingsWalletHdWalletSyncSyncClick = 'settings | wallet | hd wallet sync | sync | click',
  SettingsWalletHdWalletSyncSyncNewAddresses = 'settings | wallet | hd wallet sync | sync | new addresses',
  SettingsCustomSubmitApiClick = 'settings | custom submit api | click',
  SettingsCustomSubmitApiXClick = 'settings | custom submit api | x | click',
  SettingsCustomSubmitApiEnableClick = 'settings | custom submit api | enable | click',
  // Recieve section
  ReceiveClick = 'receive | receive | click',
  ReceiveCopyAddressIconClick = 'receive | receive | copy address icon | click',
  ReceiveCopyADAHandleIconClick = 'receive | receive | copy ADA handle icon | click',
  ReceiveYourWalletAddressXClick = 'receive | Your wallet address | x | click',
  // Dapp Connector
  DappConnectorAuthorizeDappAuthorizeClick = 'dapp connector | authorize dapp | authorize | click',
  DappConnectorAuthorizeDappCancelClick = 'dapp connector | authorize dapp | cancel | click',
  DappConnectorAuthorizeDappDappConnectorBetaClick = 'dapp connector | authorize dapp | dapp connector beta | click',
  DappConnectorAuthorizeDappConnectionAlwaysClick = 'dapp connector | authorize dapp | dapp connection | always | click',
  DappConnectorAuthorizeDappConnectionOnlyOnceClick = 'dapp connector | authorize dapp | dapp connection | only once | click',
  // User
  UserWalletProfileIconClick = 'user/wallet profile | profile icon | click',
  UserWalletProfileWalletAddressClick = 'user/wallet profile | wallet address | click',
  UserWalletProfileAddressBookClick = 'user/wallet profile | address book | click',
  UserWalletProfileSettingsClick = 'user/wallet profile | settings | click',
  UserWalletProfileLightModeClick = 'user/wallet profile | light mode | click',
  UserWalletProfileDarkModeClick = 'user/wallet profile | dark mode | click',
  UserWalletProfileNetworkClick = 'user/wallet profile | network | click',
  UserWalletProfileNetworkPreviewClick = 'user/wallet profile | network | preview | click',
  UserWalletProfileNetworkPreprodClick = 'user/wallet profile | network | preprod | click',
  UserWalletProfileNetworkMainnetClick = 'user/wallet profile | network | mainnet | click',
  UserWalletProfileNetworkSanchonetClick = 'user/wallet profile | network | sanchonet | click',
  UserWalletProfileLockWalletClick = 'user/wallet profile | lock wallet | click',
  UserWalletProfileAddNewWalletClick = 'user/wallet profile | add new wallet | click',
  // Lace Logo
  WalletLaceClick = 'wallet | lace | click',
  WalletSessionStartPageview = 'wallet | session start | pageview',
  // Tokens
  TokenTokensClick = 'token | tokens | click',
  TokenTokensTokenRowClick = 'token | tokens | token row | click',
  TokenTokenDetailViewAllClick = 'token | token detail | view all | click',
  TokenTokenDetailXClick = 'token | token detail | x | click',
  // Activities
  ActivityActivityClick = 'activity | activity | click',
  ActivityActivityActivityRowClick = 'activity | activity | activity row | click',
  ActivityActivityDetailTransactionHashClick = 'activity | activity detail | transaction hash | click',
  ActivityActivityDetailInputsClick = 'activity | activity detail | inputs | click',
  ActivityActivityDetailOutputsClick = 'activity | activity detail | outputs | click',
  ActivityActivityDetailXClick = 'activity | activity detail | x | click',
  // Unlock Wallet
  UnlockWalletWelcomeBackUnlockClick = 'unlock wallet | welcome back! | unlock | click',
  UnlockWalletWelcomeBackForgotPasswordClick = 'unlock wallet | welcome back! | forgot password? | click',
  UnlockWalletForgotPasswordProceedClick = 'unlock wallet | forgot password? | proceed | click',
  UnlockWalletForgotPasswordCancelClick = 'unlock wallet | forgot password? | cancel | click',
  UnlockWalletForgotPasswordNextClick = 'unlock wallet | forgot password? | set up your password | next | click',
  UnlockWalletForgotPasswordRecoveryPhraseLengthNextClick = 'unlock wallet | forgot password? | recovery phrase length | next | click',
  UnlockWalletForgotPasswordRecoveryPhraseNextClick = 'unlock wallet | forgot password? | enter your recovery phrase | next | click',
  UnlockWalletForgotPasswordEnterWalletClick = 'unlock wallet | forgot password? | set up your password | enter wallet | click',
  UnlockWalletForgotPasswordRecoveryPhrasePasteFromClipboardClick = 'unlock wallet | forgot password? | enter your recovery phrase | paste from clipboard | click'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostHogProperty = string | boolean | Record<string, any> | Array<Record<string, any>>;
export type PostHogProperties = Record<string, PostHogProperty>;

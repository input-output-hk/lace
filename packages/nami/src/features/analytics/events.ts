/* eslint-disable @typescript-eslint/no-explicit-any */
export enum Events {
  PageView = '$pageview',

  // create wallet
  OnboardingCreateClick = 'nami mode | onboarding | new wallet | create | click',
  OnboardingCreateWritePassphraseNextClick = 'nami mode | onboarding | new wallet | write passphrase | next | click',
  OnboardingCreateEnterPassphraseNextClick = 'nami mode | onboarding | new wallet | enter passphrase | next | click',
  OnboardingCreateEnterPassphraseSkipClick = 'nami mode | onboarding | new wallet | enter passphrase | skip | click',
  OnboardingCreateWalletNamePasswordNextClick = 'nami mode | onboarding | new wallet | wallet name & password | next | click',

  // import wallet
  OnboardingRestoreClick = 'nami mode | onboarding | restore wallet | click',
  OnboardingRestoreEnterPassphraseNextClick = 'nami mode | onboarding | restore wallet | enter passphrase | next | click',
  OnboardingRestoreWalletNamePasswordNextClick = 'nami mode | onboarding | restore wallet | wallet name & password | next | click',

  // receive
  ReceiveClick = 'nami mode | receive | receive | click',
  ReceiveCopyAddressIconClick = 'nami mode | receive | receive | copy address icon | click',

  // send
  SendClick = 'nami mode | send | send | click',
  SendTransactionDataReviewTransactionClick = 'nami mode | send | transaction data | review transaction | click',
  SendTransactionConfirmationConfirmClick = 'nami mode | send | transaction confirmation | confirm | click',
  SendTransactionConfirmed = 'nami mode | send | transaction confirmed',

  // settings
  SettingsNetworkPreviewClick = 'nami mode | settings | network | preview | click',
  SettingsNetworkPreprodClick = 'nami mode | settings | network | preprod | click',
  SettingsNetworkMainnetClick = 'nami mode | settings | network | mainnet | click',
  SettingsNetworkCustomNodeClick = 'nami mode | settings | network | custom node | click',

  SettingsRemoveWalletClick = 'nami mode | settings | remove wallet | click',
  SettingsHoldUpRemoveWalletClick = 'nami mode | settings | hold up | remove wallet | click',
  SettingsHoldUpBackClick = 'nami mode | settings | hold up | back | click',

  SettingsThemeLightModeClick = 'nami mode | settings | theme | light mode | click',
  SettingsThemeDarkModeClick = 'nami mode | settings | theme | dark mode | click',

  SettingsChangePasswordClick = 'nami mode | settings | change password | click',
  SettingsChangePasswordConfirm = 'nami mode | settings | change password | confirm',

  SettingsChangeAvatarClick = 'nami mode | settings | change avatar | click',

  SettingsCollateralClick = 'nami mode | settings | collateral | click',
  SettingsCollateralConfirmClick = 'nami mode | settings | collateral | confirm | click',
  SettingsCollateralReclaimCollateralClick = 'nami mode | settings | collateral | reclaim collateral | click',
  SettingsCollateralXClick = 'nami mode | settings | collateral | x | click',

  SettingsTermsAndConditionsClick = 'nami mode | settings | terms and conditions | click',
  SettingsTermsAndConditionsXClick = 'nami mode | settings | terms and conditions | x | click',

  SettingsNewAccountClick = 'nami mode | settings | new account | click',
  SettingsNewAccountConfirmClick = 'nami mode | settings | new account | confirm | click',
  SettingsNewAccountXClick = 'nami mode | settings | new account | x | click',

  SettingsAuthorizedDappsClick = 'nami mode | settings | authorized dapps | click',
  SettingsAuthorizedDappsTrashBinIconClick = 'nami mode | settings | authorized dapps | trash bin icon | click',

  // account
  AccountDeleteClick = 'nami mode | account | delete | click',
  AccountDeleteConfirmClick = 'nami mode | account | delete | confirm | click',

  // dapp
  DappConnectorAuthorizeDappAuthorizeClick = 'nami mode | dapp connector | authorize dapp | authorize | click',
  DappConnectorAuthorizeDappCancelClick = 'nami mode | dapp connector | authorize dapp | cancel | click',
  DappConnectorDappTxSignClick = 'nami mode | dapp connector | tx | sign | click',
  DappConnectorDappTxConfirmClick = 'nami mode | dapp connector | tx | confirm | click',
  DappConnectorDappTxCancelClick = 'nami mode | dapp connector | tx | cancel | click',
  DappConnectorDappDataSignClick = 'nami mode | dapp connector | data | sign | click',
  DappConnectorDappDataConfirmClick = 'nami mode | dapp connector | data | confirm | click',
  DappConnectorDappDataCancelClick = 'nami mode | dapp connector | data | cancel | click',

  // hw
  HWConnectClick = 'nami mode | hardware wallet | connect | click',
  HWConnectNextClick = 'nami mode | hardware wallet | connect hw | next | click',
  HWSelectAccountNextClick = 'nami mode | hardware wallet | select hw account | next | click',
  HWDoneGoToWallet = 'nami mode | onboarding | hardware wallet | all done | go to my wallet | click',

  // nfts
  NFTsClick = 'nami mode | nft | nfts | click',
  NFTsImageClick = 'nami mode | nft | nfts | nft image | click',

  // activity
  ActivityActivityClick = 'nami mode | activity | activity | click',
  ActivityActivityActivityRowClick = 'nami mode | activity | activity | activity row | click',
  ActivityActivityDetailTransactionHashClick = 'nami mode | activity | activity detail | transaction hash | click',

  // staking
  StakingClick = 'nami mode | staking | staking | click',
  StakingConfirmClick = 'nami mode | staking | staking | confirm | click',
  StakingUnstakeClick = 'nami mode | staking | staking | unstake | click',
  StakingUnstakeConfirmClick = 'nami mode | staking | staking | unstake | confirm | click',
}

export type Property =
  | Record<string, any>
  | Record<string, any>[]
  | boolean
  | string;
export type Properties = Record<string, Property>;

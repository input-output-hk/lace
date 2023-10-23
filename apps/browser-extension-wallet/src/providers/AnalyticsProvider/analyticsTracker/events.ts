import { PostHogAction, PostHogOnboardingActionsType } from './types';

const WalletSetup = {
  ANALYTICS_AGREE: 'analytics-agree',
  ANALYTICS_SKIP: 'analytics-skip',
  CONNECT_HW_START: 'connect-hw-start',
  CREATE_WALLET_START: 'create-wallet-start',
  LEGAL_STUFF_NEXT: 'legal-stuff-next',
  MNEMONICS_INPUT_0_NEXT: 'mnemonics-input-0-next',
  MNEMONICS_INPUT_1_NEXT: 'mnemonics-input-1-next',
  MNEMONICS_INPUT_2_NEXT: 'mnemonics-input-2-next',
  MNEMONICS_WRITEDOWN_0_NEXT: 'mnemonics-writedown-0-next',
  MNEMONICS_WRITEDOWN_1_NEXT: 'mnemonics-writedown-1-next',
  MNEMONICS_WRITEDOWN_2_NEXT: 'mnemonics-writedown-2-next',
  RESTORE_WALLET_START: 'restore-wallet-start',
  SELECT_ACCOUNT_NEXT: 'select-account-next',
  SELECT_MODEL_NEXT: 'select-model-next',
  SETUP_FINISHED_NEXT: 'setup-finished-next', // Onboarding goal trigger
  WALLET_NAME_NEXT: 'wallet-name-next',
  WALLET_PASSWORD_NEXT: 'wallet-password-next'
};

export const postHogOnboardingActions: PostHogOnboardingActionsType = {
  create: {
    ANALYTICS_AGREE_CLICK: PostHogAction.OnboardingCreateAnalyticsAgreeClick,
    ANALYTICS_SKIP_CLICK: PostHogAction.OnboardingCreateAnalyticsSkipClick,
    SETUP_OPTION_CLICK: PostHogAction.OnboardingCreateClick,
    LACE_TERMS_OF_USE_NEXT_CLICK: PostHogAction.OnboardingCreateLaceTermsOfUseNextClick,
    WALLET_NAME_NEXT_CLICK: PostHogAction.OnboardingCreateWalletNameNextClick,
    WALLET_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingCreateWalletPasswordNextClick,
    PASSPHRASE_INTRO_NEXT_CLICK: PostHogAction.OnboardingCreatePassphraseIntroNextClick,
    WRITE_PASSPHRASE_01_NEXT_CLICK: PostHogAction.OnboardingCreateWritePassphrase01NextClick,
    WRITE_PASSPHRASE_09_NEXT_CLICK: PostHogAction.OnboardingCreateWritePassphrase09NextClick,
    WRITE_PASSPHRASE_17_NEXT_CLICK: PostHogAction.OnboardingCreateWritePassphrase17NextClick,
    ENTER_PASSPHRASE_01_NEXT_CLICK: PostHogAction.OnboardingCreateEnterPassphrase01NextClick,
    ENTER_PASSPHRASE_09_NEXT_CLICK: PostHogAction.OnboardingCreateEnterPassphrase09NextClick,
    ENTER_PASSPHRASE_17_NEXT_CLICK: PostHogAction.OnboardingCreateEnterPassphrase17NextClick,
    DONE_GO_TO_WALLET: PostHogAction.OnboardingCreateDoneGoToWallet,
    WALLET_NAME_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingCreateWalletNamePasswordNextClick,
    PASSPHRASE_INTRO_PLAY_VIDEO_CLICK: PostHogAction.OnboardingCreatePassphraseIntroPlayVideoClick
  },
  restore: {
    ANALYTICS_AGREE_CLICK: PostHogAction.OnboardingRestoreAnalyticsAgreeClick,
    ANALYTICS_SKIP_CLICK: PostHogAction.OnboardingRestoreAnalyticsSkipClick,
    SETUP_OPTION_CLICK: PostHogAction.OnboardingRestoreClick,
    LACE_TERMS_OF_USE_NEXT_CLICK: PostHogAction.OnboardingRestoreLaceTermsOfUseNextClick,
    WALLET_NAME_NEXT_CLICK: PostHogAction.OnboardingRestoreWalletNameNextClick,
    WALLET_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingRestoreWalletPasswordNextClick,
    RECOVERY_PASSPHRASE_LENGTH_NEXT_CLICK: PostHogAction.OnboardingRestoreRecoveryPhraseLengthNextClick,
    RESTORE_MULTI_ADDR_CANCEL_CLICK: PostHogAction.OnboardingRestoreWarningMultiAddressWalletCancelClick,
    RESTORE_MULTI_ADDR_OK_CLICK: PostHogAction.OnboardingRestoreWarningMultiAddressWalletOkClick,
    ENTER_PASSPHRASE_01_NEXT_CLICK: PostHogAction.OnboardingRestoreEnterPassphrase01NextClick,
    ENTER_PASSPHRASE_09_NEXT_CLICK: PostHogAction.OnboardingRestoreEnterPassphrase09NextClick,
    ENTER_PASSPHRASE_17_NEXT_CLICK: PostHogAction.OnboardingRestoreEnterPassphrase17NextClick,
    DONE_GO_TO_WALLET: PostHogAction.OnboardingRestoreDoneGoToWallet,
    WALLET_NAME_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingRestoreWalletNamePasswordNextClick
  },
  hw: {
    ANALYTICS_AGREE_CLICK: PostHogAction.OnboardingHWAnalyticsAgreeClick,
    ANALYTICS_SKIP_CLICK: PostHogAction.OnboardingHWAnalyticsSkipClick,
    WALLET_NAME_NEXT_CLICK: PostHogAction.OnboardingHWNameNextClick,
    LACE_TERMS_OF_USE_NEXT_CLICK: PostHogAction.OnboardinHWLaceTermsOfUseNextClick,
    CONNECT_HW_NEXT_CLICK: PostHogAction.OnboardingHWConnectNextClick,
    SELECT_HW_ACCOUNT_NEXT_CLICK: PostHogAction.OnboardingHWSelectAccountNextClick,
    SETUP_OPTION_CLICK: PostHogAction.OnboardingHWClick,
    DONE_GO_TO_WALLET: PostHogAction.OnboardingHWDoneGoToWallet
  },
  // eslint-disable-next-line camelcase
  forgot_password: {
    WALLET_PASSWORD_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordNextClick,
    RECOVERY_PASSPHRASE_LENGTH_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordRecoveryPhraseLengthNextClick,
    ENTER_PASSPHRASE_01_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordEnterPassphrase01NextClick,
    ENTER_PASSPHRASE_09_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordEnterPassphrase09NextClick,
    ENTER_PASSPHRASE_17_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordEnterPassphrase17NextClick
  }
};

// TODO: can we have browser and popup as a custom dimension or similar instead of in the event name? [LW-5452]
const SendTransaction = {
  BACK_TX_DETAILS_BROWSER: 'back-tx-details-browser',
  BACK_TX_DETAILS_POPUP: 'back-tx-details-popup',
  CANCEL_TX_DETAILS_BROWSER: 'cancel-tx-details-browser',
  CANCEL_TX_DETAILS_POPUP: 'cancel-tx-details-popup',
  CANCEL_TX_PASSWORD_BROWSER: 'cancel-tx-password-browser',
  CANCEL_TX_PASSWORD_POPUP: 'cancel-tx-password-popup',
  CONFIRM_TX_DETAILS_BROWSER: 'confirm-tx-details-browser',
  CONFIRM_TX_DETAILS_POPUP: 'confirm-tx-details-popup',
  COPY_TX_HASH: 'copy-tx-hash',
  INPUT_TX_PASSWORD_BROWSER: 'input-tx-password-browser',
  INPUT_TX_PASSWORD_POPUP: 'input-tx-password-popup',
  REVIEW_TX_DETAILS_BROWSER: 'review-tx-details-browser',
  REVIEW_TX_DETAILS_POPUP: 'review-tx-details-popup',
  SEE_ADA_ALLOCATION_INFO: 'see-ada-allocation-info',
  SEE_TX_DEPOSIT_INFO: 'see-tx-deposit-info',
  SEE_TX_FEE_INFO: 'see-tx-fee-info',
  SEND_TX_BUTTON_BROWSER: 'send-tx-button-browser',
  SEND_TX_BUTTON_POPUP: 'send-tx-button-popup',
  TX_FAIL_BROWSER: 'tx-fail-browser',
  TX_FAIL_POPUP: 'tx-fail-popup',
  TX_SUCCESS_BROWSER: 'tx-success-browser', // Tx Sent goal trigger
  TX_SUCCESS_POPUP: 'tx-success-popup', // Tx Sent goal trigger
  SUCCESS_VIEW_TX_BROWSER: 'success-view-tx-browser',
  SUCCESS_VIEW_TX_POPUP: 'success-view-tx-popup',
  FAIL_BACK_BROWSER: 'fail-back-browser',
  FAIL_BACK_POPUP: 'fail-back-popup'
};

const ViewNFTs = {
  VIEW_NFT_LIST_BROWSER: 'view-nft-list-browser',
  VIEW_NFT_LIST_POPUP: 'view-nft-list-popup',
  VIEW_NFT_DETAILS_BROWSER: 'view-nft-details-browser',
  VIEW_NFT_DETAILS_POPUP: 'view-nft-details-popup',
  SEND_NFT_BROWSER: 'send-nft-browser',
  SEND_NFT_POPUP: 'send-nft-popup'
};

const AddressBook = {
  VIEW_ADDRESSES_BROWSER: 'view-addresses-browser',
  ADD_ADDRESS_BROWSER: 'add-address-browser',
  VIEW_ADDRESS_DETAILS_BROWSER: 'view-address-details-browser',
  EDIT_ADDRESS_BROWSER: 'edit-address-browser',
  UPDATE_ADDRESS_BROWSER: 'update-address-browser',
  DELETE_ADDRESS_PROMPT_BROWSER: 'delete-address-prompt-browser',
  CONFIRM_DELETE_ADDRESS_BROWSER: 'confirm-delete-address-browser',
  CANCEL_DELETE_ADDRESS_BROWSER: 'cancel-delete-address-browser',
  VIEW_ADDRESSES_POPUP: 'view-addresses-popup',
  ADD_ADDRESS_POPUP: 'add-address-popup',
  VIEW_ADDRESS_DETAILS_POPUP: 'view-address-details-popup',
  EDIT_ADDRESS_POPUP: 'edit-address-popup',
  UPDATE_ADDRESS_POPUP: 'update-address-popup',
  DELETE_ADDRESS_PROMPT_POPUP: 'delete-address-prompt-popup',
  CONFIRM_DELETE_ADDRESS_POPUP: 'confirm-delete-address-popup',
  CANCEL_DELETE_ADDRESS_POPUP: 'cancel-delete-address-popup',
  CONFIRM_UPDATE_ADDRESS_POPUP: 'confirm-update-address-popup',
  CONFIRM_UPDATE_ADDRESS_BROWSER: 'confirm-update-address-browser',
  CANCEL_UPDATE_ADDRESS_POPUP: 'cancel-udpate-address-popup',
  CANCEL_UPDATE_ADDRESS_BROWSER: 'cancel-update-address-browser',
  CONFIRM_DELETE_UPDATE_ADDRESS_POPUP: 'confirm-delete-update-address-popup',
  CONFIRM_DELETE_UPDATE_ADDRESS_BROWSER: 'confirm-delete-update-address-browser',
  CANCEL_DELETE_UPDATE_ADDRESS_POPUP: 'cancel-delete-update-address-popup',
  CANCEL_DELETE_UPDATE_ADDRESS_BROWSER: 'cancel-delete-update-address-browser',
  DELETE_UPDATE_ADDRESS_PROMPT_POPUP: 'delete-update-address-prompt-popup',
  DELETE_UPDATE_ADDRESS_PROMPT_BROWSER: 'delete-update-address-prompt-browser'
};

const ViewTokens = {
  VIEW_TOKEN_LIST_BROWSER: 'view-token-list-browser',
  VIEW_TOKEN_LIST_POPUP: 'view-token-list-popup',
  VIEW_TOKEN_DETAILS_BROWSER: 'view-token-details-browser',
  VIEW_TOKEN_DETAILS_POPUP: 'view-token-details-popup',
  SEND_TOKEN_BROWSER: 'send-token-browser',
  SEND_TOKEN_POPUP: 'send-token-popup',
  VIEW_TOKEN_TX_DETAILS_BROWSER: 'view-token-tx-details-browser',
  VIEW_TOKEN_TX_DETAILS_POPUP: 'view-token-tx-details-popup'
};

const Staking = {
  VIEW_STAKING_BROWSER: 'view-staking-browser',
  VIEW_STAKING_POPUP: 'view-staking-popup',
  VIEW_STAKEPOOL_INFO_BROWSER: 'view-stakepool-info-browser',
  VIEW_STAKEPOOL_INFO_POPUP: 'view-stakepool-info-popup',
  STAKE_ON_THIS_POOL_BROWSER: 'stake-on-this-pool-browser',
  STAKE_ON_THIS_POOL_POPUP: 'stake-on-this-pool-popup',
  STAKING_CONFIRMATION_BROWSER: 'staking-confirmation-browser',
  STAKING_CONFIRMATION_POPUP: 'staking-confirmation-popup',
  STAKING_SIGN_CONFIRMATION_BROWSER: 'staking-sign-confirmation-browser',
  STAKING_SIGN_CONFIRMATION_POPUP: 'staking-sign-confirmation-popup',
  STAKING_SUCCESS_BROWSER: 'staking-success-browser', // Stake goal trigger
  STAKING_SUCCESS_POPUP: 'staking-success-popup', // Stake goal trigger
  STAKING_FAIL_BROWSER: 'staking-fail-browser',
  STAKING_FAIL_POPUP: 'staking-fail-popup',
  CONFIRM_SWITCH_POOL_BROWSER: 'confirm-switching-pool-browser',
  CONFIRM_SWITCH_POOL_POPUP: 'confirm-switching-pool-popup'
};

const ViewTransactions = {
  VIEW_TX_LIST_BROWSER: 'view-tx-list-browser',
  VIEW_TX_LIST_POPUP: 'view-tx-list-popup',
  VIEW_TX_DETAILS_BROWSER: 'view-tx-details-browser',
  VIEW_TX_DETAILS_POPUP: 'view-tx-details-popup'
};

export const AnalyticsEventNames = {
  WalletSetup,
  SendTransaction,
  ViewTokens,
  ViewNFTs,
  AddressBook,
  ViewTransactions,
  Staking
};
